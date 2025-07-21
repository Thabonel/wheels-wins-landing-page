import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { recordLogin, endSession } from '@/lib/authLogging';
import { setUser as setSentryUser, setTag, captureMessage } from '@/lib/sentry';

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isDevMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const isDevMode = false;
  const isAuthenticated = !!user && !!session;

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state change:', event, session?.user?.email);

      try {
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to defer Supabase calls and prevent deadlocks
          setTimeout(async () => {
            try {
              await recordLogin(session.user.id, session);
            } catch (error) {
              console.error('Error recording login:', error);
            }
          }, 0);
        }
        
        if (event === 'SIGNED_OUT' && session) {
          setTimeout(async () => {
            try {
              await endSession(session.access_token);
            } catch (error) {
              console.error('Error ending session:', error);
            }
          }, 0);
        }

        // Only synchronous state updates here
        setSession(session);
        setToken(session?.access_token || null);
        
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name
          };
          setUser(userData);
          
          // Update Sentry user context (without PII)
          setSentryUser({
            id: userData.id,
            // Don't include email for privacy
          });
          setTag('authenticated', 'true');
          
          if (event === 'SIGNED_IN') {
            captureMessage('User signed in', 'info');
          }
        } else {
          setUser(null);
          
          // Clear Sentry user context
          setSentryUser(null);
          setTag('authenticated', 'false');
          
          if (event === 'SIGNED_OUT') {
            captureMessage('User signed out', 'info');
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Auth state change error:', error);
        setLoading(false);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setToken(session?.access_token || null);
      
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name
        };
        setUser(userData);
        
        // Set initial Sentry user context
        setSentryUser({
          id: userData.id,
        });
        setTag('authenticated', 'true');
      } else {
        setSentryUser(null);
        setTag('authenticated', 'false');
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: fullName ? { full_name: fullName } : {}
      }
    });
    
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const logout = signOut;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        session,
        loading,
        isAuthenticated,
        isDevMode,
        signIn,
        signUp,
        signOut,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}