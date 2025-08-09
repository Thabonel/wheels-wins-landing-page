
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
      // Generate a secret key for 2FA (in production, use a proper 2FA library)
      const secret = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const qrCodeUrl = `otpauth://totp/WheelsAndWins:${user.email}?secret=${secret}&issuer=WheelsAndWins`;
      
      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );

      // Store in database (not enabled yet)
      const { error } = await supabase
        .from('user_two_factor_auth')
        .upsert({
          user_id: user.id,
          secret_key: secret,
          backup_codes: backupCodes,
          enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return {
        secret,
        qrCode: qrCodeUrl,
        backupCodes
      };
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      toast.error('Failed to setup 2FA');
      return null;
    }
  };

  const verifyAndEnable = async (token: string) => {
    if (!user) return false;

    try {
      // In production, you'd verify the TOTP token against the secret
      // For now, we'll do a simple validation (6 digits)
      if (!/^\d{6}$/.test(token)) {
        toast.error('Please enter a valid 6-digit code');
        return false;
      }

      // Enable 2FA in database
      const { error } = await supabase
        .from('user_two_factor_auth')
        .update({
          enabled: true,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchTwoFactorData();
      toast.success('Two-factor authentication enabled successfully');
      return true;
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
