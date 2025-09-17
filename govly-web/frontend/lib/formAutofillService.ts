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
