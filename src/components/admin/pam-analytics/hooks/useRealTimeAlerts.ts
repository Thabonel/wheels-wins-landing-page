
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/services/api';

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


  const fetchAlerts = async () => {
    try {
      const response = await apiFetch('/api/alerts/status');
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      const data = await response.json();
      setAlerts(data.alerts ?? []);
    } catch (error: any) {
      console.error('Failed to fetch alerts:', error);
      setAlerts([]);
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
