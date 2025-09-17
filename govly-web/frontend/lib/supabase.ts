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
