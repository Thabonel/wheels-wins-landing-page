
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase';

export const useAdminAuth = () => {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        
        // Try to bootstrap admin if this appears to be the expected admin user
        if (user.email === 'thabonel0@gmail.com') {
          console.log('🔧 Attempting to bootstrap admin access...');
          try {
            const { error: bootstrapError } = await supabase.rpc('bootstrap_admin_user', {
              user_email: user.email,
              user_uuid: user.id
            });

            if (bootstrapError) {
              console.error('❌ Bootstrap failed:', bootstrapError);
              setError('Admin access not granted. Please contact an administrator.');
            } else {
              console.log('✅ Admin bootstrapped successfully, rechecking...');
              // Recheck admin status after bootstrap
              setTimeout(checkAdminStatus, 1000);
              return;
            }
          } catch (err) {
            console.error('❌ Bootstrap error:', err);
            setError('Failed to bootstrap admin access.');
          }
        } else {
          setError('Admin access not granted. Please contact an administrator.');
        }
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

  useEffect(() => {
    checkAdminStatus();
  }, [user, session]);

  return { 
    isAdmin, 
    isLoading, 
    error,
    recheckAdminStatus: checkAdminStatus
  };
};
