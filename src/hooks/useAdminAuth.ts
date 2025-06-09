
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
      console.log('🔐 Starting admin check for user:', user?.id, 'email:', user?.email);
      
      if (!user || !session) {
        console.log('❌ No user or session found');
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        console.log('📋 Querying profiles table for user:', user.id);
        
        // Use maybeSingle() to handle missing profiles gracefully
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status, email')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          setError(`Profile fetch failed: ${profileError.message}`);
          setIsAdmin(false);
        } else if (!profile) {
          console.log('❌ No profile found for user');
          setError('User profile not found. Please contact an administrator.');
          setIsAdmin(false);
        } else {
          console.log('✅ User profile found:', {
            role: profile.role,
            status: profile.status,
            email: profile.email
          });
          
          // Check if user has admin role and is active
          const adminStatus = profile.role === 'admin' && profile.status === 'active';
          console.log('🔑 Admin status determined:', adminStatus);
          setIsAdmin(adminStatus);
          setError(null);
        }
      } catch (err) {
        console.error('💥 Unexpected error during admin check:', err);
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
