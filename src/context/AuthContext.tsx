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
        setSessi