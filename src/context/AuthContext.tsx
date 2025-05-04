
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Mock user type - would normally come from your API/auth service
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  isDevMode: boolean;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  isDevMode: false
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  
  // Detect if we're in the Lovable preview environment
  const isDevMode = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname.includes('lovable.dev') || 
    window.location.hostname.includes('lovable.app')
  );
  
  // In dev mode, automatically log in
  useEffect(() => {
    if (isDevMode) {
      setUser(mockUser);
    } else {
      // Only check localStorage in production
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  }, [isDevMode]);
  
  // Mock user for demonstration
  const mockUser: User = {
    id: "123",
    name: "John Doe",
    email: "john@example.com",
    avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png"
  };
  
  // Login function - in a real app, this would authenticate with your backend
  const login = () => {
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };
  
  // Logout function
  const logout = () => {
    // In dev mode, we don't actually log out
    if (!isDevMode) {
      setUser(null);
      localStorage.removeItem('user');
    }
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      isDevMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
