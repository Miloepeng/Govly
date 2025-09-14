import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, UserProfile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Profile doesn't exist yet, which is normal for new users
      } else {
        setProfile(data)
      }
    } catch (error) {
      // Handle fetch error silently
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      
      if (error) {
        return { error }
      }
      
      return { error: null }
    } catch (err) {
      return { 
        error: { 
          message: 'Network error. Please check your Supabase configuration.' 
        } 
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'No user logged in' }

    try {
      console.log('Updating profile for user:', user.id)
      console.log('Updates:', updates)
      
      // First try to update existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Update error:', error)
        
        // If profile doesn't exist, create it first
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...')
          
          const { data: userData } = await supabase.auth.getUser()
          const currentUser = userData.user
          
          if (!currentUser) return { error: 'User not found' }
          
          // Create new profile
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              email: currentUser.email,
              full_name: currentUser.user_metadata?.full_name || '',
              nationality: 'Vietnamese',
              ...updates
            })
            .select()
            .single()
          
          if (createError) {
            console.error('Error creating profile:', createError)
            return { error: createError }
          }
          
          console.log('Profile created successfully:', newProfile)
          setProfile(newProfile)
          return { error: null }
        }
        
        return { error }
      } else {
        setProfile(data)
        return { error: null }
      }
    } catch (err) {
      return { 
        error: { 
          message: `Update failed: ${err instanceof Error ? err.message : 'Unknown error'}` 
        } 
      }
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
