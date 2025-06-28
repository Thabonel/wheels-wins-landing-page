
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';

export function useAdminAuth() {
  const { user, session, isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAdminStatus = async () => {
    console.log('Checking admin status:', { isAuthenticated, user: user?.email, session: !!session });
    
    if (!isAuthenticated || !user || !session) {
      console.log('Not authenticated or missing user/session');
      setIsAdmin(false);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setError(null);
      // For now, we'll use a simple check
      // In production, this should check against a database or user roles
      const adminEmails = ['admin@wheelsandwins.com', 'thabonel0@gmail.com'];
      const isUserAdmin = adminEmails.includes(user.email || '');
      console.log('Admin check result:', { userEmail: user.email, isUserAdmin });
      setIsAdmin(isUserAdmin);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setError('Failed to verify admin status');
    } finally {
      setLoading(false);
    }
  };

  const recheckAdminStatus = () => {
    setLoading(true);
    checkAdminStatus();
  };

  useEffect(() => {
    checkAdminStatus();
  }, [user, session, isAuthenticated]);

  return {
    isAdmin,
    loading,
    error,
    user,
    session,
    recheckAdminStatus
  };
}
