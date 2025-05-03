
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
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {}
});

// Mock user for demonstration
const mockUser: User = {
  id: "123",
  name: "John Doe",
  email: "john@example.com",
  avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png"
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  
  // Check if user is already logged in (from localStorage, cookies, etc)
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);
  
  // Login function - in a real app, this would authenticate with your backend
  const login = () => {
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };
  
  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
