
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';

export function useAdminAuth() {
  const { user, session, isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated || !user || !session) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // For now, we'll use a simple check
        // In production, this should check against a database or user roles
        const adminEmails = ['admin@wheelsandwins.com'];
        setIsAdmin(adminEmails.includes(user.email || ''));
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, session, isAuthenticated]);

  return {
    isAdmin,
    loading,
    user,
    session
  };
}
