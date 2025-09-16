#!/bin/bash

# Quick Fix with Stub Files
# This creates minimal stub files to get the build working

set -e

echo "🔧 Creating stub files for quick fix..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

cd frontend

# Create lib directory
mkdir -p lib

# Create minimal stub files
cat > lib/applicationService.ts << 'EOF'
// Stub file for ApplicationService
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
    return { error: null }
  }

  static async getUserApplications(userId: string): Promise<{ data: ApplicationData[] | null; error: any }> {
    return { data: [], error: null }
  }

  static async updateApplicationStatus(
    applicationId: string, 
    status: 'applied' | 'reviewed' | 'confirmed',
    progress: any
  ): Promise<{ error: any }> {
    return { error: null }
  }

  static async deleteApplication(applicationId: string): Promise<{ error: any }> {
    return { error: null }
  }

  static async migrateLocalStorageApplications(userId: string): Promise<{ error: any }> {
    return { error: null }
  }
}
EOF

cat > lib/formAutofillService.ts << 'EOF'
// Stub file for FormAutofillService
export interface FormField {
  name: string
  type: string
  label: string
  required?: boolean
  description?: string
}

export class FormAutofillService {
  static getAutofillValue(field: FormField, userProfile: any): string {
    return ''
  }

  static getAutofillSuggestions(fields: FormField[], userProfile: any): Record<string, string> {
    return {}
  }

  static canAutofill(field: FormField, userProfile: any): boolean {
    return false
  }

  static getAutofillStats(fields: FormField[], userProfile: any): {
    totalFields: number
    autofillableFields: number
    autofillPercentage: number
  } {
    return {
      totalFields: fields.length,
      autofillableFields: 0,
      autofillPercentage: 0
    }
  }
}
EOF

# Create supabase.ts stub if it doesn't exist
if [ ! -f "lib/supabase.ts" ]; then
cat > lib/supabase.ts << 'EOF'
// Stub file for Supabase
export interface UserProfile {
  full_name?: string
  email?: string
  phone_number?: string
  address?: string
  id_number?: string
  date_of_birth?: string
  gender?: string
  nationality?: string
  occupation?: string
}

export interface UserApplication {
  id: string
  user_id: string
  form_title: string
  form_data: any
  schema: any
  status: string
  progress: any
  created_at: string
  updated_at: string
}

export const supabase = {
  from: (table: string) => ({
    select: () => ({ eq: () => ({ order: () => ({ execute: () => ({ data: [], error: null }) }) }) }) }),
    insert: () => ({ execute: () => ({ data: [], error: null }) }),
    update: () => ({ eq: () => ({ execute: () => ({ data: [], error: null }) }) }),
    delete: () => ({ eq: () => ({ execute: () => ({ data: [], error: null }) }) })
  })
}
EOF
fi

echo "✅ Stub files created!"
echo "Now try building:"
echo "npm run build"



