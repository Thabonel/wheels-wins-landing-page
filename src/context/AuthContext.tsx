import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { recordLogin, endSession } from '@/lib/authLogging';

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
        setToken(session?.access_token ?? null);
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name
          });
        } else {
          setUser(null);
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }

      console.log('Initial session check:', session?.user?.email);
      
      setSession(session);
      setToken(session?.access_token ?? null);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          full_name: session.user.user_metadata?.full_name
        });
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
      password
    });

    if (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const currentToken = session?.access_token;
    const { error } = await supabase.auth.signOut();
    if (currentToken) {
      await endSession(currentToken);
    }
    if (error) {
      console.error('Logout error:', error);
    }
  };

  const logout = signOut; // Alias

  console.log("Auth Debug - user:", user, "isAuthenticated:", isAuthenticated, "isDevMode:", isDevMode, "loading:", loading);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token,
      session,
      loading, 
      isAuthenticated, 
      isDevMode, 
      signIn, 
      signUp, 
      signOut, 
      logout 
    }}>
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