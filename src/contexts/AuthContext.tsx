import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    console.log('AuthContext: Fetching profile for userId', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        console.error('Error details:', { code: error.code, message: error.message, details: error.details });
        
        // If profile doesn't exist, try to create it
        if (error.code === 'PGRST116') {
          console.log('AuthContext: Profile not found, creating new profile');
          return await createProfile(userId);
        }
        
        // If it's an auth error, try to refresh session
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          console.log('AuthContext: Auth error, trying to refresh session');
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session?.user) {
            console.error('No valid session found after refresh:', sessionError);
            return null;
          }
          // Try again with refreshed session
          return await fetchProfile(userId);
        }
        
        return null;
      }

      console.log('AuthContext: Profile data received', data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const createProfile = async (userId: string) => {
    console.log('AuthContext: Creating profile for userId', userId);
    try {
      // Get user data from auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user data:', userError);
        // If auth error, try to refresh session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          console.error('No valid session found:', sessionError);
          return null;
        }
        // Use session user data
        const sessionUser = session.user;
        const profileData = {
          user_id: userId,
          display_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Użytkownik',
          email: sessionUser.email
        };

        const { data, error } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (error) {
          console.error('Error creating profile with session data:', error);
          return null;
        }

        console.log('AuthContext: Profile created successfully with session data', data);
        return data;
      }

      if (!user) {
        console.error('No user data available');
        return null;
      }

      const profileData = {
        user_id: userId,
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Użytkownik',
        email: user.email
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      console.log('AuthContext: Profile created successfully', data);
      return data;
    } catch (error) {
      console.error('Error creating profile:', error);
      return null;
    }
  };

  // Function to refresh profile
  const refreshUserData = async (userId: string) => {
    console.log('AuthContext: Refreshing user data for', userId);
    const userProfile = await fetchProfile(userId);
    setProfile(userProfile as Profile);
  };

  useEffect(() => {
    console.log('AuthContext: Setting up auth state listener');
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthContext: Auth state changed', { event, session: session ? 'present' : 'null', userId: session?.user?.id });
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('AuthContext: User found, fetching profile for', session.user.id);
          // Fetch user profile with a small delay to allow the trigger to complete
          setTimeout(async () => {
            await refreshUserData(session.user.id);
            setLoading(false);
          }, 100);
        } else {
          console.log('AuthContext: No user, clearing profile');
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthContext: Initial session check', { session: session ? 'present' : 'null', userId: session?.user?.id });
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('AuthContext: Initial user found, fetching profile for', session.user.id);
        setTimeout(async () => {
          await refreshUserData(session.user.id);
          setLoading(false);
        }, 100);
      } else {
        console.log('AuthContext: No initial user, setting loading false');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Set up real-time subscriptions for profiles
  useEffect(() => {
    if (!user?.id) return;

    console.log('AuthContext: Setting up real-time subscriptions for user', user.id);
    
    // Subscribe to changes in profiles table
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('AuthContext: Profile changed', payload);
          setTimeout(() => refreshUserData(user.id), 100);
        }
      )
      .subscribe();

    return () => {
      profilesChannel.unsubscribe();
    };
  }, [user?.id]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  // Simplified - all authenticated users have the same permissions

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};