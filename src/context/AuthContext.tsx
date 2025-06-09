
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isDevMode: boolean;
  supabase: typeof supabase;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  isDevMode: false,
  supabase: {} as typeof supabase, // Add a placeholder for the supabase client
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Detect if we're in the Lovable preview environment
  const isDevMode = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname.includes('lovable.dev') || 
    window.location.hostname.includes('lovable.app')
  );

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state change:', event, 'Session:', !!newSession);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);
        
        // Handle post-login redirect to You page
        if (event === 'SIGNED_IN' && newSession?.user) {
          // Use setTimeout to ensure state is updated before navigation
          setTimeout(() => {
            if (window.location.pathname === '/auth') {
              window.location.href = '/you';
            }
          }, 100);
        }
        
        // Handle post-logout redirect to homepage
        if (event === 'SIGNED_OUT') {
          setTimeout(() => {
            window.location.href = '/';
          }, 100);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Login function - using Supabase auth
  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  };
  
  // Signup function - using Supabase auth
  const signup = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
  };
  
  // Logout function
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated: !!user,
      login,
      signup,
      logout,      
      supabase, // Include the supabase instance
      isDevMode
    }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
