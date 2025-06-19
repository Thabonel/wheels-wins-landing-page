
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';

export function useAdminAuth() {
  const { user, session, isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAdminStatus = async () => {
    if (!isAuthenticated || !user || !session) {
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
      setIsAdmin(adminEmails.includes(user.email || ''));
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setError('Failed to check admin status. Please try again.');
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
    isLoading: loading, // Alias for consistency
    error,
    user,
    session,
    recheckAdminStatus
  };
}
