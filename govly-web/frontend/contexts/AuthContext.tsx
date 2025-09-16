import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase, UserProfile, clearSupabaseClient, getSupabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any; session?: Session | null }>
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
    let isMounted = true

    // Try to get session from sessionStorage first
    const sessionToken = sessionStorage.getItem('sb-access-token');
    if (sessionToken) {
      setSession({ access_token: sessionToken } as Session);
      setLoading(false); // Show content immediately if we have a token
    }

    // Then verify/refresh the session in the background
    ;(async () => {
      try {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (session?.user) {
          setSession(session)
          setUser(session.user)
          // Fetch profile in parallel
          fetchUserProfile(session.user.id).catch(console.error)
        } else {
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      } catch (err) {
        console.error('Session error:', err)
        if (isMounted) setLoading(false)
      }
    })()

    const supabase = getSupabase()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        fetchUserProfile(session.user.id).catch(console.error)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Shorter safety timeout since we show content earlier
    const safety = setTimeout(() => {
      if (isMounted) setLoading(false)
    }, 3000)

    return () => {
      isMounted = false
      clearTimeout(safety)
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const supabase = getSupabase()
      
      // Log the query we're about to make
      console.log('Querying user_profiles table with id:', userId);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          full_name,
          phone_number,
          id_number,
          address,
          date_of_birth,
          gender,
          nationality,
          occupation,
          created_at,
          updated_at
        `)
        .eq('id', userId)
        .single()

      console.log('Query response:', { data, error });

      if (error) {
        console.log('Error fetching profile:', error);
        // If profile doesn't exist, create an empty one
        if (error.code === 'PGRST116') { // No rows returned
          console.log('No profile found, creating new one');
          try {
            const currentUser = await supabase.auth.getUser()
            console.log('Current user data:', currentUser.data.user);
            
            const newProfileData = {
              id: userId,
              email: currentUser.data.user?.email,
              full_name: currentUser.data.user?.user_metadata?.full_name || '',
              nationality: 'Vietnamese',
              phone_number: '',
              id_number: '',
              address: '',
              date_of_birth: '',
              gender: '',
              occupation: ''
            };
            console.log('Creating new profile with data:', newProfileData);

            const { data: newProfile, error: createError } = await supabase
              .from('user_profiles')
              .insert(newProfileData)
              .select()
              .single()

            console.log('Insert response:', { newProfile, createError });

            if (!createError && newProfile) {
              console.log('New profile created successfully:', newProfile);
              setProfile(newProfile)
            } else if (createError) {
              console.error('Error creating new profile:', createError);
              // Log more details about the error
              console.error('Error details:', {
                code: createError.code,
                message: createError.message,
                details: createError.details,
                hint: createError.hint
              });
            }
          } catch (createErr) {
            console.error('Error in profile creation process:', createErr)
          }
        }
      } else {
        console.log('Existing profile found:', data);
        setProfile(data)
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const supabase = getSupabase()
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
    try {
      console.log('Initializing Supabase client...');
      // Clear any existing client to ensure fresh connection
      clearSupabaseClient();
      const supabase = getSupabase();

      console.log('Attempting sign in...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        return { error };
      }

      if (!data?.user) {
        console.error('No user data received');
        return { 
          error: { 
            message: 'No user data received from authentication.' 
          } 
        };
      }

      console.log('Sign in successful:', data.user.id);
      
        // Store tokens in sessionStorage and session cookies (for middleware)
        if (data.session) {
          const accessToken = data.session.access_token;
          const refreshToken = data.session.refresh_token;

          // sessionStorage for client use (cleared when browser closes)
          sessionStorage.setItem('sb-access-token', accessToken);
          sessionStorage.setItem('sb-refresh-token', refreshToken);

          // Session cookies for middleware (expires when browser closes)
          document.cookie = `sb-access-token=${accessToken}; path=/`;
          document.cookie = `sb-refresh-token=${refreshToken}; path=/`;
        console.log('Tokens stored successfully (localStorage + cookies)');
      }

      // Set session and user immediately
      setSession(data.session);
      setUser(data.user);
      
      // Fetch profile in the background
      fetchUserProfile(data.user.id).catch(err => {
        console.error('Error fetching user profile:', err);
      });

      return { error: null, session: data.session };
    } catch (err: unknown) {
      console.error('Unexpected error during sign in:', err instanceof Error ? err.message : String(err));
      // Clear client on error
      clearSupabaseClient();
      return { 
        error: { 
          message: err instanceof Error ? err.message : 'An unexpected error occurred during sign in.' 
        } 
      };
    }
  }

  const signOut = async () => {
    // Clear all local state immediately
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Navigate immediately
    window.location.replace('/login');
    
    // Call Supabase signOut in the background
    getSupabase().auth.signOut().catch(err => {
      console.error('Background signout error:', err);
    });
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'No user logged in' }

    try {
      console.log('Updating profile for user:', user.id)
      console.log('Current profile state:', profile)
      console.log('Updates to apply:', updates)
      const supabase = getSupabase()

      // Upsert ensures the row is created if missing and updated if present
      const payload = { 
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        nationality: 'Vietnamese',
        phone_number: '',
        id_number: '',
        address: '',
        date_of_birth: '',
        gender: '',
        occupation: '',
        ...updates  // This will override any default values with updates
      }
      console.log('Full payload for upsert:', payload)

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()

      if (error) {
        console.error('Upsert error:', error)
        return { error }
      }

      console.log('Profile updated successfully:', data)
      setProfile(data)
      return { error: null }
    } catch (err) {
      console.error('Unexpected error during profile update:', err)
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
