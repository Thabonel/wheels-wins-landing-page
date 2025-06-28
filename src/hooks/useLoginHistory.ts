
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase';
import { toast } from 'sonner';

interface LoginHistoryItem {
  id: string;
  ip_address: string;
  user_agent: string;
  device_info: any;
  location_info: any;
  login_method: string;
  login_time: string;
  success: boolean;
}

export const useLoginHistory = () => {
  const { user } = useAuth();
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchLoginHistory();
  }, [user]);

  const fetchLoginHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_login_history')
        .select('*')
        .eq('user_id', user.id)
        .order('login_time', { ascending: false })
        .limit(50);

      if (error) throw error;

      setLoginHistory((data || []).map(item => ({
        ...item,
        ip_address: item.ip_address as string || 'Unknown'
      })));
    } catch (error) {
      console.error('Error fetching login history:', error);
      toast.error('Failed to load login history');
    } finally {
      setLoading(false);
    }
  };

  return {
    loginHistory,
    loading,
    refetch: fetchLoginHistory,
  };
};
