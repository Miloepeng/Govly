import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { getSupabase, UserProfile, clearSupabaseClient } from '@/lib/supabase'

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

    ;(async () => {
      try {
        console.log('AuthContext: Initial mount, fetching session...');
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        console.log('AuthContext: Got session:', session);
        
        if (!isMounted) return
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('AuthContext: User found in session:', session.user);
          console.log('AuthContext: User metadata:', session.user.user_metadata);
          await fetchUserProfile(session.user.id)
        } else {
          console.log('AuthContext: No user in session');
          setLoading(false)
        }
      } catch (err: unknown) {
        console.error('Error getting initial session:', err instanceof Error ? err.message : String(err))
        if (isMounted) setLoading(false)
      }
    })()

    const supabase2 = getSupabase()
    const { data: { subscription } } = supabase2.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Safety timeout to avoid indefinite loading
    const safety = setTimeout(() => {
      if (isMounted) setLoading(false)
    }, 10000)

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
      
      // Store tokens in localStorage and cookies (for middleware)
      if (data.session) {
        const accessToken = data.session.access_token;
        const refreshToken = data.session.refresh_token;

        // localStorage for client use
        localStorage.setItem('sb-access-token', accessToken);
        localStorage.setItem('sb-refresh-token', refreshToken);

        // Cookies for middleware (client-set, not httpOnly)
        const maxAge = 60 * 60 * 24 * 7; // 7 days
        document.cookie = `sb-access-token=${accessToken}; path=/; max-age=${maxAge}`;
        document.cookie = `sb-refresh-token=${refreshToken}; path=/; max-age=${maxAge}`;
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
    
    // Clear storage
    localStorage.clear();
    
    // Clear cookies
    document.cookie = 'sb-access-token=; path=/; max-age=0';
    document.cookie = 'sb-refresh-token=; path=/; max-age=0';
    
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
