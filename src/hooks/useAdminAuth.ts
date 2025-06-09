
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase';

export const useAdminAuth = () => {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || !session) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log('Checking admin status for user:', user.id);
        
        // Query the profiles table to check if user has admin role
        // This should now work with the fixed RLS policies
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          setError(`Profile fetch failed: ${profileError.message}`);
          setIsAdmin(false);
        } else if (!profile) {
          console.log('No profile found for user');
          setError('User profile not found');
          setIsAdmin(false);
        } else {
          console.log('User profile:', profile);
          // Check if user has admin role and is active
          const adminStatus = profile.role === 'admin' && profile.status === 'active';
          console.log('Is admin:', adminStatus);
          setIsAdmin(adminStatus);
          setError(null);
        }
      } catch (err) {
        console.error('Admin check error:', err);
        setError('Failed to verify admin status');
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, session]);

  return { isAdmin, isLoading, error };
};
