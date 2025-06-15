
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase';

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
  supabase: {} as typeof supabase,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Detect if we're in the Lovable preview environment
  const isDevMode = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname.includes('lovable.dev') || 
    window.location.hostname.includes('lovable.app')
  );

  React.useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state change:', event, 'Session:', !!newSession);
        
        // Update state immediately
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);
        
        // Handle navigation after state updates
        if (event === 'SIGNED_IN' && newSession?.user) {
          // Check if this is a new user (first sign in)
          const isNewUser = newSession.user.created_at === newSession.user.last_sign_in_at;
          
          // Use setTimeout to ensure state is updated before navigation
          setTimeout(() => {
            if (window.location.pathname === '/signup' || (isNewUser && window.location.pathname !== '/onboarding')) {
              window.location.href = '/onboarding';
            } else if (window.location.pathname === '/auth') {
              window.location.href = '/you';
            }
          }, 100);
        }
        
        // Handle logout navigation - ensure complete session clearing
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing session and redirecting');
          // Clear any remaining session data
          setSession(null);
          setUser(null);
          
          // Clear localStorage to ensure complete logout
          localStorage.removeItem('supabase.auth.token');
          
          // Redirect to homepage after logout
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
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`
      }
    });
    
    if (error) throw error;
  };
  
  // Enhanced logout function with complete session clearing
  const logout = async () => {
    try {
      console.log('Initiating logout process...');
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }
      
      console.log('Logout successful');
      
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, clear local state
      setUser(null);
      setSession(null);
      throw error;
    }
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated: !!user && !!session,
      login,
      signup,
      logout,      
      supabase,
      isDevMode
    }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
