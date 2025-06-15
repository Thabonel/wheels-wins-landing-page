
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
        console.log('📋 Querying admin_users table for user:', user.id);
        
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('role, status, email')
          .eq('user_id', user.id)
          .maybeSingle();

        if (adminError) {
          console.error('❌ Admin user fetch error:', adminError);
          setError(`Admin check failed: ${adminError.message}`);
          setIsAdmin(false);
        } else if (!adminUser) {
          console.log('❌ No admin record found for user');
          setError('Admin access not granted. Please contact an administrator.');
          setIsAdmin(false);
        } else {
          console.log('✅ Admin user found:', {
            role: adminUser.role,
            status: adminUser.status,
            email: adminUser.email
          });
          
          // Check if user has admin role and is active
          const adminStatus = adminUser.role === 'admin' && adminUser.status === 'active';
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
