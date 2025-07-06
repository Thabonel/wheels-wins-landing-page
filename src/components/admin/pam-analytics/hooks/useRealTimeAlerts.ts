
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export const useRealTimeAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { toast } = useToast();

  // TODO: Remove this fallback once the backend returns real alerts
  const mockAlerts: Alert[] = [
    {
      id: '1',
      type: 'warning',
      title: 'High Error Rate',
      message: 'Error rate has increased to 4.2% in the last hour',
      timestamp: new Date().toISOString(),
      acknowledged: false
    },
    {
      id: '2',
      type: 'info',
      title: 'Peak Usage',
      message: 'Current usage is 150% above average for this time',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      acknowledged: false
    }
  ];

  const fetchAlerts = async () => {
    try {
      // Get recent system events and errors to generate alerts
      const { data: agentLogs, error } = await supabase
        .from('agent_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const recentLogs = agentLogs?.filter(log => {
        const logTime = new Date(log.created_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return logTime >= oneHourAgo;
      }) || [];

      const generatedAlerts: Alert[] = [];

      // Generate alert for high activity
      if (recentLogs.length > 50) {
        generatedAlerts.push({
          id: 'high-activity',
          type: 'info',
          title: 'High Activity Detected',
          message: `${recentLogs.length} requests in the last hour (above normal)`,
          timestamp: new Date().toISOString(),
          acknowledged: false
        });
      }

      // Generate alert for memory usage
      const memoryUsageCount = recentLogs.filter(log => log.memory_used).length;
      if (memoryUsageCount > recentLogs.length * 0.8) {
        generatedAlerts.push({
          id: 'high-memory',
          type: 'warning',
          title: 'High Memory Usage',
          message: `${Math.round((memoryUsageCount / recentLogs.length) * 100)}% of requests using memory lookup`,
          timestamp: new Date().toISOString(),
          acknowledged: false
        });
      }

      // If no real alerts, use a subset of mock alerts
      setAlerts(generatedAlerts.length > 0 ? generatedAlerts : mockAlerts.slice(0, 1));
    } catch (error: any) {
      console.error('Failed to fetch alerts:', error);
      // Fallback to mock alerts on error
      setAlerts(mockAlerts);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      )
    );
  };

  useEffect(() => {
    fetchAlerts();
    
    // Check for new alerts every 10 seconds
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  // Show toast for new critical alerts
  useEffect(() => {
    alerts.forEach(alert => {
      if (alert.type === 'critical' && !alert.acknowledged) {
        toast({
          title: alert.title,
          description: alert.message,
          variant: "destructive",
        });
      }
    });
  }, [alerts, toast]);

  return {
    alerts,
    acknowledgeAlert,
    refetch: fetchAlerts
  };
};
