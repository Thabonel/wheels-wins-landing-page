
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
        
        // Use the security definer function approach if needed, but first try direct query
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status, email')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          
          // If profile doesn't exist, try to create it automatically
          if (profileError.code === 'PGRST116') {
            console.log('📝 Profile not found, creating new profile...');
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                user_id: user.id,
                email: user.email || '',
                role: 'user', // Default role
                status: 'active',
                region: 'Australia'
              });

            if (insertError) {
              console.error('❌ Failed to create profile:', insertError);
              setError(`Failed to create user profile: ${insertError.message}`);
              setIsAdmin(false);
            } else {
              console.log('✅ Profile created successfully as regular user');
              setIsAdmin(false);
              setError(null);
            }
          } else {
            setError(`Profile fetch failed: ${profileError.message}`);
            setIsAdmin(false);
          }
        } else if (!profile) {
          console.log('❌ No profile found for user');
          setError('User profile not found');
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
