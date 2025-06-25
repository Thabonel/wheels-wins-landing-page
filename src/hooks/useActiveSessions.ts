
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase';
import { toast } from 'sonner';

interface ActiveSession {
  id: string;
  session_id: string;
  device_info: any;
  ip_address: string;
  user_agent: string;
  location_info: any;
  last_activity: string;
  created_at: string;
  is_current: boolean;
}

export const useActiveSessions = () => {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchActiveSessions();
  }, [user]);

  const fetchActiveSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_active_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      setActiveSessions(data || []);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      toast.error('Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_active_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('session_id', sessionId);

      if (error) throw error;

      await fetchActiveSessions();
      toast.success('Session terminated successfully');
      return true;
    } catch (error) {
      console.error('Error terminating session:', error);
      toast.error('Failed to terminate session');
      return false;
    }
  };

  const terminateAllOtherSessions = async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_active_sessions')
        .delete()
        .eq('user_id', user.id)
        .neq('is_current', true);

      if (error) throw error;

      await fetchActiveSessions();
      toast.success('All other sessions terminated');
      return true;
    } catch (error) {
      console.error('Error terminating sessions:', error);
      toast.error('Failed to terminate sessions');
      return false;
    }
  };

  return {
    activeSessions,
    loading,
    terminateSession,
    terminateAllOtherSessions,
    refetch: fetchActiveSessions,
  };
};
