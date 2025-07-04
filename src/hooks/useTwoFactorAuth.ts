
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { apiFetch } from '@/services/api';
import { toast } from 'sonner';

interface TwoFactorData {
  id?: string;
  enabled: boolean;
  secret_key?: string;
  backup_codes?: string[];
  verified_at?: string;
}

export const useTwoFactorAuth = () => {
  const { user } = useAuth();
  const [twoFactorData, setTwoFactorData] = useState<TwoFactorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchTwoFactorData();
  }, [user]);

  const fetchTwoFactorData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_two_factor_auth')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setTwoFactorData(data || { enabled: false });
    } catch (error) {
      console.error('Error fetching 2FA data:', error);
      toast.error('Failed to load 2FA settings');
    } finally {
      setLoading(false);
    }
  };

  const setupTwoFactor = async () => {
    if (!user) return null;

    try {
      const response = await apiFetch('/api/v1/auth/setup-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });

      if (!response.ok) throw new Error('Request failed');

      return await response.json();
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      toast.error('Failed to setup 2FA');
      return null;
    }
  };

  const verifyAndEnable = async (token: string) => {
    if (!user) return false;

    try {
      const response = await apiFetch('/api/v1/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, token })
      });

      if (!response.ok) throw new Error('Request failed');

      const data = await response.json();

      if (data.success) {
        await fetchTwoFactorData();
        toast.success('Two-factor authentication enabled successfully');
        return true;
      } else {
        toast.error('Invalid verification code');
        return false;
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      toast.error('Failed to verify 2FA');
      return false;
    }
  };

  const disable = async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_two_factor_auth')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setTwoFactorData({ enabled: false });
      toast.success('Two-factor authentication disabled');
      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast.error('Failed to disable 2FA');
      return false;
    }
  };

  return {
    twoFactorData,
    loading,
    setupTwoFactor,
    verifyAndEnable,
    disable,
    refetch: fetchTwoFactorData,
  };
};
