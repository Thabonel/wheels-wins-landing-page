
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

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
      // TODO: Replace with actual API call
      // const response = await fetch('/webhook/analytics/alerts');
      // if (!response.ok) throw new Error('Failed to fetch alerts');
      // const result = await response.json();
      
      // Simulate API call
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
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
