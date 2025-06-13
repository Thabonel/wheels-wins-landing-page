
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isDevMode } = useAuth();

  // Debug logging
  console.log('ProtectedRoute Debug:', {
    user: !!user,
    isAuthenticated,
    isDevMode,
    userEmail: user?.email || 'No user'
  });

  // Allow access if authenticated OR in dev mode
  if (isAuthenticated || isDevMode) {
    console.log('ProtectedRoute: Allowing access');
    return <>{children}</>;
  }

  // Redirect to auth page if not authenticated
  console.log('ProtectedRoute: Redirecting to /auth');
  return <Navigate to="/auth" replace />;
};

export default ProtectedRoute;
