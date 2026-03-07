import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { recordLogin, endSession } from '@/lib/authLogging';
import { setUser as setSentryUser, setTag, captureMessage } from '@/lib/sentry';
import { AuthErrorHandler, AuthError, AuthErrorType } from '@/utils/authErrorHandler';
import { authSessionManager } from '@/context/authSessionManager';

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
  lastError: AuthError | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<AuthError | null>(null);
  const authStateDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastAuthEventRef = useRef<string | null>(null);
  const authErrorHandler = useRef<AuthErrorHandler | null>(null);

  const isDevMode = false;
  const isAuthenticated = !!user && !!session;


  // Set up automatic session refresh
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (session && user) {
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt ? expiresAt - now : 0;

        if (timeUntilExpiry < 300) {
          await refreshSession();
        }
      }
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, [session, user]);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener with debouncing
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Debounce rapid auth state changes
      if (authStateDebounceRef.current) {
        clearTimeout(authStateDebounceRef.current);
      }

      // Store the last event for debugging
      lastAuthEventRef.current = event;

      // Process auth state change with debounce
      authStateDebounceRef.current = setTimeout(async () => {
        if (!mounted) return;

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            // Use setTimeout to defer Supabase calls and prevent deadlocks
            setTimeout(async () => {
              try {
                await recordLogin(session.user.id, session);
              } catch (error) {
              }
            }, 0);
          }
        
          if (event === 'SIGNED_OUT' && session) {
            setTimeout(async () => {
              try {
                await endSession(session.access_token);
              } catch (error) {
              }
            }, 0);
          }

          // Only synchronous state updates here
          setSession(session);
          setToken(session?.access_token || null);
          authSessionManager.setSession(session || null);

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
          console.error('[AuthContext] Auth state change error:', error);
          setLoading(false);
        }
      }, 300); // 300ms debounce to prevent rapid state changes
    });

    // Detect PWA mode for iOS authentication handling
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      // In iOS PWA mode, we might not have access to the browser's stored session
      if (isPWA && isIOS && !session) {
        console.warn('[AuthContext] iOS PWA detected with no session - user will need to re-authenticate');
        captureMessage('iOS PWA requires re-authentication due to storage isolation', 'info');
      }

      setSession(session);
      setToken(session?.access_token || null);
      authSessionManager.setSession(session || null);

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
      if (authStateDebounceRef.current) {
        clearTimeout(authStateDebounceRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  // Utility function to create user-friendly error messages
  const createAuthError = (error: any): AuthError => {
    if (!error) return {
      type: AuthErrorType.UNKNOWN,
      message: 'An unknown error occurred',
      canRetry: true,
      suggestedAction: 'retry'
    };

    const errorMessage = error.message?.toLowerCase() || '';

    if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid email or password')) {
      return {
        type: AuthErrorType.UNAUTHORIZED,
        message: 'Invalid email or password. Please check your credentials and try again.',
        canRetry: true,
        suggestedAction: 'login',
        originalError: error
      };
    }

    if (errorMessage.includes('email not confirmed')) {
      return {
        type: AuthErrorType.UNAUTHORIZED,
        message: 'Please check your email and click the confirmation link to verify your account.',
        canRetry: false,
        suggestedAction: 'none',
        originalError: error
      };
    }

    if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
      return {
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Too many login attempts. Please wait a few minutes and try again.',
        canRetry: true,
        suggestedAction: 'retry',
        originalError: error
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        type: AuthErrorType.NETWORK_ERROR,
        message: 'Network connection issue. Please check your internet connection and try again.',
        canRetry: true,
        suggestedAction: 'retry',
        originalError: error
      };
    }

    if (errorMessage.includes('session') || errorMessage.includes('expired')) {
      return {
        type: AuthErrorType.SESSION_MISSING,
        message: 'Your session has expired. Please log in again.',
        canRetry: false,
        suggestedAction: 'login',
        originalError: error
      };
    }

    return {
      type: AuthErrorType.UNKNOWN,
      message: error.message || 'An unexpected error occurred. Please try again.',
      canRetry: true,
      suggestedAction: 'retry',
      originalError: error
    };
  };

  const clearError = () => {
    setLastError(null);
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh failed:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    setLastError(null);
    setLoading(true);

    // Cancel any pending auth state debounce to prevent interference
    if (authStateDebounceRef.current) {
      clearTimeout(authStateDebounceRef.current);
      authStateDebounceRef.current = null;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Debug logging for iPad pattern error investigation
        console.error('🔍 Supabase Auth Error Details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        });

        // For iPad debugging - add error details to the error message itself
        if (error.message?.includes('string did not match') || error.message?.includes('expected pattern')) {
          const debugInfo = `\n\nDEBUG INFO:\nStatus: ${error.status}\nName: ${error.name}\nDevice: ${navigator.userAgent.includes('iPad') ? 'iPad' : 'Other'}\nBrowser: ${navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Safari'}\nTime: ${new Date().toISOString()}`;
          error.message = error.message + debugInfo;
        }

        // Stale session tokens can cause false "Invalid login credentials" errors.
        // Clear the local session and retry once before showing the error.
        if (error.message?.includes('Invalid login credentials')) {
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {
            // Ignore signOut errors - we just want to clear stale state
          }

          const { error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (retryError) {
            const authError = createAuthError(retryError);
            setLastError(authError);
            throw retryError;
          }
          // Retry succeeded
          return;
        }

        const authError = createAuthError(error);
        setLastError(authError);
        throw error;
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setLastError(null);
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: fullName ? { full_name: fullName } : {}
        }
      });

      if (error) {
        const authError = createAuthError(error);
        setLastError(authError);
        throw error;
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setLastError(null);

    try {
      // Clear local state immediately for better UX
      setUser(null);
      setSession(null);
      setToken(null);
      authSessionManager.clearSession();

      // Clear Sentry user context
      setSentryUser(null);
      setTag('authenticated', 'false');

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        // Don't throw error on sign out - we've already cleared local state
      }

      captureMessage('User signed out', 'info');
    } catch (error) {
      console.error('Sign out error:', error);
      // Don't throw error on sign out - we've already cleared local state
    }
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
        lastError,
        signIn,
        signUp,
        signOut,
        logout,
        clearError,
        refreshSession,
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
