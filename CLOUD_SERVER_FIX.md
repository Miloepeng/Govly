# Fix Missing Lib Files on Cloud Server

## Problem
The Docker build is failing because the `frontend/lib/` directory is missing. This happened because the `lib/` directory was previously ignored by git.

## Solution

On your cloud server, create the missing lib files:

### 1. Create the lib directory
```bash
mkdir -p govly-web/frontend/lib
```

### 2. Create `supabase.ts`
```bash
cat > govly-web/frontend/lib/supabase.ts << 'EOF'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Function to get the Supabase client
export function getSupabase(): SupabaseClient {
  return supabase
}

// Function to clear the Supabase client (for cleanup)
export function clearSupabaseClient(): void {
  // In a real implementation, you might want to clear any cached data
  // For now, this is a no-op since we're using a singleton client
}

// Database types
export interface UserProfile {
  id: string
  full_name: string
  address: string
  email: string
  phone_number: string
  id_number: string
  date_of_birth?: string
  gender?: string
  nationality?: string
  occupation?: string
  created_at: string
  updated_at: string
}

export interface UserApplication {
  id: string
  user_id: string
  form_title: string
  form_data: Record<string, any>
  schema: any
  status: 'applied' | 'reviewed' | 'confirmed'
  progress: {
    applied: { date: string | null; completed: boolean }
    reviewed: { date: string | null; completed: boolean }
    confirmed: { date: string | null; completed: boolean }
  }
  created_at: string
  updated_at: string
}
EOF
```

### 3. Create `applicationService.ts`
```bash
cat > govly-web/frontend/lib/applicationService.ts << 'EOF'
import { supabase, UserApplication } from './supabase'

export interface ApplicationData {
  id: string
  formTitle: string
  dateApplied: string
  status: 'draft' | 'applied' | 'reviewed' | 'confirmed'
  formData: Record<string, any>
  schema: any
  progress: {
    applied: { date: string | null; completed: boolean }
    reviewed: { date: string | null; completed: boolean }
    confirmed: { date: string | null; completed: boolean }
  }
  completionPercentage?: number
  lastSaved?: string
}

export class ApplicationService {
  static async saveApplication(userId: string, application: ApplicationData): Promise<{ error: any }> {
    try {
      // Check if application with this ID already exists to prevent duplicates
      const { data: existingApp, error: checkError } = await supabase
        .from('user_applications')
        .select('id')
        .eq('id', application.id)
        .single()

      if (existingApp) {
        console.warn('Application with ID already exists:', application.id);
        return { error: { message: 'Application with this ID already exists' } };
      }

      // Insert new application
      const insertData: any = {
        id: application.id, // Use the provided ID
        user_id: userId,
        form_title: application.formTitle,
        form_data: application.formData,
        schema: application.schema,
        status: application.status,
        progress: application.progress,
      }

      // Add optional fields if they exist
      if (application.completionPercentage !== undefined) {
        insertData.completion_percentage = application.completionPercentage
      }
      if (application.lastSaved) {
        insertData.last_saved = application.lastSaved
      }

      const { error } = await supabase
        .from('user_applications')
        .insert(insertData)

      return { error }
    } catch (error) {
      return { error }
    }
  }

  static async savePartialForm(
    userId: string, 
    formTitle: string, 
    formData: Record<string, any>, 
    schema: any,
    completionPercentage: number
  ): Promise<{ error: any; applicationId?: string }> {
    try {
      // Check if there's already a draft application for this form
      const { data: existingApps, error: fetchError } = await supabase
        .from('user_applications')
        .select('id, form_data, completion_percentage')
        .eq('user_id', userId)
        .eq('form_title', formTitle)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1)

      if (fetchError) {
        return { error: fetchError }
      }

      const now = new Date().toISOString()

      if (existingApps && existingApps.length > 0) {
        // Update existing draft
        const existingApp = existingApps[0]
        const { error } = await supabase
          .from('user_applications')
          .update({
            form_data: formData,
            completion_percentage: completionPercentage,
            last_saved: now,
            updated_at: now,
          })
          .eq('id', existingApp.id)

        return { error, applicationId: existingApp.id }
      } else {
        // Create new draft application
        const { data, error } = await supabase
          .from('user_applications')
          .insert({
            user_id: userId,
            form_title: formTitle,
            form_data: formData,
            schema: schema,
            status: 'draft',
            progress: {
              applied: { date: null, completed: false },
              reviewed: { date: null, completed: false },
              confirmed: { date: null, completed: false }
            },
            completion_percentage: completionPercentage,
            last_saved: now,
          })
          .select('id')
          .single()

        return { error, applicationId: data?.id }
      }
    } catch (error) {
      return { error }
    }
  }

  static async updateDraftToApplied(applicationId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('user_applications')
        .update({
          status: 'applied',
          progress: {
            applied: { date: new Date().toISOString(), completed: true },
            reviewed: { date: null, completed: false },
            confirmed: { date: null, completed: false }
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)

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

  // Migrate localStorage applications to Supabase
  static async migrateLocalStorageApplications(userId: string): Promise<{ error: any }> {
    try {
      const localApplications = JSON.parse(localStorage.getItem('applications') || '[]')
      
      if (localApplications.length === 0) {
        return { error: null }
      }

      // Insert all local applications with duplicate checking
      for (const app of localApplications) {
        const { error } = await this.saveApplication(userId, app);
        if (error) {
          console.warn('Failed to migrate application:', app.id, error);
        }
      }

      // Clear localStorage after migration attempt
      localStorage.removeItem('applications')

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  // Clean up duplicate applications
  static async cleanupDuplicates(userId: string): Promise<{ error: any }> {
    try {
      // Get all applications for the user
      const { data: applications, error: fetchError } = await supabase
        .from('user_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        return { error: fetchError }
      }

      // Group by form_title and keep only the most recent one
      const groupedApps = new Map();
      applications.forEach(app => {
        const key = `${app.form_title}-${app.status}`;
        if (!groupedApps.has(key) || new Date(app.created_at) > new Date(groupedApps.get(key).created_at)) {
          groupedApps.set(key, app);
        }
      });

      // Delete duplicates (keep only the most recent ones)
      const appsToKeep = Array.from(groupedApps.values());
      const appsToDelete = applications.filter(app => 
        !appsToKeep.some(keepApp => keepApp.id === app.id)
      );

      for (const app of appsToDelete) {
        await supabase
          .from('user_applications')
          .delete()
          .eq('id', app.id)
      }

      console.log(`Cleaned up ${appsToDelete.length} duplicate applications`);
      return { error: null }
    } catch (error) {
      return { error }
    }
  }
}
EOF
```

### 4. Create `formAutofillService.ts`
```bash
cat > govly-web/frontend/lib/formAutofillService.ts << 'EOF'
import { UserProfile } from './supabase'

export interface FormField {
  name: string
  type: string
  label: string
  required?: boolean
  description?: string
}

export class FormAutofillService {
  // Map common field names to user profile properties
  private static fieldMappings: Record<string, keyof UserProfile> = {
    // Name fields
    'full_name': 'full_name',
    'name': 'full_name',
    'fullname': 'full_name',
    'applicant_name': 'full_name',
    'owner_name': 'full_name',
    'contact_name': 'full_name',
    
    // Email fields
    'email': 'email',
    'email_address': 'email',
    'contact_email': 'email',
    
    // Phone fields
    'phone': 'phone_number',
    'phone_number': 'phone_number',
    'mobile': 'phone_number',
    'mobile_number': 'phone_number',
    'contact_phone': 'phone_number',
    
    // Address fields
    'address': 'address',
    'residential_address': 'address',
    'home_address': 'address',
    'permanent_address': 'address',
    
    // ID fields
    'id_number': 'id_number',
    'national_id': 'id_number',
    'citizen_id': 'id_number',
    'passport_number': 'id_number',
    'id_card': 'id_number',
    
    // Date of birth
    'date_of_birth': 'date_of_birth',
    'birth_date': 'date_of_birth',
    'dob': 'date_of_birth',
    
    // Gender
    'gender': 'gender',
    'sex': 'gender',
    
    // Nationality
    'nationality': 'nationality',
    'citizenship': 'nationality',
    
    // Occupation
    'occupation': 'occupation',
    'job': 'occupation',
    'profession': 'occupation',
    'employment': 'occupation',
  }

  // Get autofill suggestions for a form field
  static getAutofillValue(field: FormField, userProfile: UserProfile | null): string {
    if (!userProfile) return ''

    const fieldName = field.name.toLowerCase().replace(/[_\s-]/g, '_')
    const mappedField = this.fieldMappings[fieldName]
    
    if (mappedField && userProfile[mappedField]) {
      return userProfile[mappedField] as string
    }

    // Try fuzzy matching for similar field names
    return this.fuzzyMatchField(fieldName, userProfile)
  }

  // Fuzzy matching for field names that don't exactly match
  private static fuzzyMatchField(fieldName: string, userProfile: UserProfile): string {
    const keywords = fieldName.split('_')
    
    for (const keyword of keywords) {
      // Check for name-related keywords
      if (['name', 'applicant', 'owner', 'contact'].includes(keyword) && userProfile.full_name) {
        return userProfile.full_name
      }
      
      // Check for email-related keywords
      if (['email', 'mail', 'contact'].includes(keyword) && userProfile.email) {
        return userProfile.email
      }
      
      // Check for phone-related keywords
      if (['phone', 'mobile', 'tel', 'contact'].includes(keyword) && userProfile.phone_number) {
        return userProfile.phone_number
      }
      
      // Check for address-related keywords
      if (['address', 'location', 'residence', 'home'].includes(keyword) && userProfile.address) {
        return userProfile.address
      }
      
      // Check for ID-related keywords
      if (['id', 'number', 'card', 'passport', 'citizen'].includes(keyword) && userProfile.id_number) {
        return userProfile.id_number
      }
    }
    
    return ''
  }

  // Get all autofill suggestions for a form schema
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

  // Check if a field can be autofilled
  static canAutofill(field: FormField, userProfile: UserProfile | null): boolean {
    return this.getAutofillValue(field, userProfile).length > 0
  }

  // Get autofill statistics for a form
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
```

### 5. Now try building again
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## Alternative: Quick Fix Script

You can also run this single command to create all the files:

```bash
mkdir -p govly-web/frontend/lib && \
# Create supabase.ts
cat > govly-web/frontend/lib/supabase.ts << 'EOF'
[PASTE THE SUPABASE.TS CONTENT HERE]
EOF
# Create applicationService.ts  
cat > govly-web/frontend/lib/applicationService.ts << 'EOF'
[PASTE THE APPLICATION SERVICE CONTENT HERE]
EOF
# Create formAutofillService.ts
cat > govly-web/frontend/lib/formAutofillService.ts << 'EOF'
[PASTE THE FORM AUTOFILL SERVICE CONTENT HERE]
EOF
```

This will create all the missing lib files and your Docker build should work!
