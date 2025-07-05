import { createContext, useContext, ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  session: any | null;
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
  const { user: clerkUser, isLoaded } = useUser();
  const { getToken, signOut: clerkSignOut } = useClerkAuth();

  const isDevMode = false;
  const loading = !isLoaded;
  const isAuthenticated = isLoaded && !!clerkUser;

  // Convert Clerk user to our User format
  const user: User | null = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    full_name: clerkUser.fullName || undefined
  } : null;

  // For compatibility, we'll create a mock session object
  const session = clerkUser ? { 
    user: clerkUser,
    access_token: null // We'll get this when needed
  } : null;

  const signIn = async (email: string, password: string) => {
    // Clerk handles sign-in through their components/modals
    // This is kept for compatibility but won't be used
    throw new Error('Use Clerk SignIn component for authentication');
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Clerk handles sign-up through their components/modals
    // This is kept for compatibility but won't be used
    throw new Error('Use Clerk SignUp component for authentication');
  };

  const signOut = async () => {
    await clerkSignOut();
  };

  const logout = signOut; // Alias

  // Get token when needed (async function for compatibility)
  const getAuthToken = async (): Promise<string | null> => {
    try {
      return await getToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  console.log("Auth Debug - user:", user, "isAuthenticated:", isAuthenticated, "isDevMode:", isDevMode, "loading:", loading);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token: null, // Token is fetched when needed via getToken()
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