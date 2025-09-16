#!/bin/bash

# Create Missing Lib Files Script
# This script ensures all required lib files exist with correct exports

set -e

echo "🔧 Creating/verifying lib files..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

cd frontend

# Create lib directory if it doesn't exist
mkdir -p lib

# Create applicationService.ts if it doesn't exist or is corrupted
cat > lib/applicationService.ts << 'EOF'
import { supabase, UserApplication } from './supabase'

export interface ApplicationData {
  id: string
  formTitle: string
  dateApplied: string
  status: 'applied' | 'reviewed' | 'confirmed'
  formData: Record<string, any>
  schema: any
  progress: {
    applied: { date: string | null; completed: boolean }
    reviewed: { date: string | null; completed: boolean }
    confirmed: { date: string | null; completed: boolean }
  }
}

export class ApplicationService {
  static async saveApplication(userId: string, application: ApplicationData): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('user_applications')
        .insert({
          user_id: userId,
          form_title: application.formTitle,
          form_data: application.formData,
          schema: application.schema,
          status: application.status,
          progress: application.progress,
        })

      return { error }
    } catch (error) {
      return { error }
    }
  }

  static async getUserApplications(userId: string): Promise<{ data: ApplicationData[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error }
      }

      const applications: ApplicationData[] = data.map(app => ({
        id: app.id,
        formTitle: app.form_title,
        dateApplied: app.created_at,
        status: app.status,
        formData: app.form_data,
        schema: app.schema,
        progress: app.progress,
      }))

      return { data: applications, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async updateApplicationStatus(
    applicationId: string, 
    status: 'applied' | 'reviewed' | 'confirmed',
    progress: any
  ): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('user_applications')
        .update({
          status,
          progress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)

      return { error }
    } catch (error) {
      return { error }
    }
  }

  static async deleteApplication(applicationId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('user_applications')
        .delete()
        .eq('id', applicationId)

      return { error }
    } catch (error) {
      return { error }
    }
  }

  static async migrateLocalStorageApplications(userId: string): Promise<{ error: any }> {
    try {
      const localApplications = JSON.parse(localStorage.getItem('applications') || '[]')
      
      if (localApplications.length === 0) {
        return { error: null }
      }

      const applicationsToInsert = localApplications.map((app: ApplicationData) => ({
        user_id: userId,
        form_title: app.formTitle,
        form_data: app.formData,
        schema: app.schema,
        status: app.status,
        progress: app.progress,
      }))

      const { error } = await supabase
        .from('user_applications')
        .insert(applicationsToInsert)

      if (!error) {
        localStorage.removeItem('applications')
      }

      return { error }
    } catch (error) {
      return { error }
    }
  }
}
EOF

# Create formAutofillService.ts if it doesn't exist or is corrupted
cat > lib/formAutofillService.ts << 'EOF'
import { UserProfile } from './supabase'

export interface FormField {
  name: string
  type: string
  label: string
  required?: boolean
  description?: string
}

export class FormAutofillService {
  private static fieldMappings: Record<string, keyof UserProfile> = {
    'full_name': 'full_name',
    'name': 'full_name',
    'fullname': 'full_name',
    'applicant_name': 'full_name',
    'owner_name': 'full_name',
    'contact_name': 'full_name',
    'email': 'email',
    'email_address': 'email',
    'contact_email': 'email',
    'phone': 'phone_number',
    'phone_number': 'phone_number',
    'mobile': 'phone_number',
    'mobile_number': 'phone_number',
    'contact_phone': 'phone_number',
    'address': 'address',
    'residential_address': 'address',
    'home_address': 'address',
    'permanent_address': 'address',
    'id_number': 'id_number',
    'national_id': 'id_number',
    'citizen_id': 'id_number',
    'passport_number': 'id_number',
    'id_card': 'id_number',
    'date_of_birth': 'date_of_birth',
    'birth_date': 'date_of_birth',
    'dob': 'date_of_birth',
    'gender': 'gender',
    'sex': 'gender',
    'nationality': 'nationality',
    'citizenship': 'nationality',
    'occupation': 'occupation',
    'job': 'occupation',
    'profession': 'occupation',
    'employment': 'occupation',
  }

  static getAutofillValue(field: FormField, userProfile: UserProfile | null): string {
    if (!userProfile) return ''

    const fieldName = field.name.toLowerCase().replace(/[_\s-]/g, '_')
    const mappedField = this.fieldMappings[fieldName]
    
    if (mappedField && userProfile[mappedField]) {
      return userProfile[mappedField] as string
    }

    return this.fuzzyMatchField(fieldName, userProfile)
  }

  private static fuzzyMatchField(fieldName: string, userProfile: UserProfile): string {
    const keywords = fieldName.split('_')
    
    for (const keyword of keywords) {
      if (['name', 'applicant', 'owner', 'contact'].includes(keyword) && userProfile.full_name) {
        return userProfile.full_name
      }
      
      if (['email', 'mail', 'contact'].includes(keyword) && userProfile.email) {
        return userProfile.email
      }
      
      if (['phone', 'mobile', 'tel', 'contact'].includes(keyword) && userProfile.phone_number) {
        return userProfile.phone_number
      }
      
      if (['address', 'location', 'residence', 'home'].includes(keyword) && userProfile.address) {
        return userProfile.address
      }
      
      if (['id', 'number', 'card', 'passport', 'citizen'].includes(keyword) && userProfile.id_number) {
        return userProfile.id_number
      }
    }
    
    return ''
  }

  static getAutofillSuggestions(fields: FormField[], userProfile: UserProfile | null): Record<string, string> {
    const suggestions: Record<string, string> = {}
    
    if (!userProfile) return suggestions
    
    fields.forEach(field => {
      const value = this.getAutofillValue(field, userProfile)
      if (value) {
        suggestions[field.name] = value
      }
    })
    
    return suggestions
  }

  static canAutofill(field: FormField, userProfile: UserProfile | null): boolean {
    return this.getAutofillValue(field, userProfile).length > 0
  }

  static getAutofillStats(fields: FormField[], userProfile: UserProfile | null): {
    totalFields: number
    autofillableFields: number
    autofillPercentage: number
  } {
    const totalFields = fields.length
    const autofillableFields = fields.filter(field => this.canAutofill(field, userProfile)).length
    const autofillPercentage = totalFields > 0 ? Math.round((autofillableFields / totalFields) * 100) : 0
    
    return {
      totalFields,
      autofillableFields,
      autofillPercentage
    }
  }
}
EOF

echo "✅ Lib files created/verified!"
echo "Now try building again:"
echo "npm run build"


