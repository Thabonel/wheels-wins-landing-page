import React, { useState, useEffect } from 'react';
import { Bell, BellRing, MapPin, CloudRain, Wrench, DollarSign, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/services/api';

interface Alert {
  id: string;
  type: 'attraction' | 'weather' | 'maintenance' | 'budget' | 'fuel';
  title: string;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  actionable: boolean;
  data?: any;
  timestamp: string;
}

interface PamAssistantProps {
  onAlertAction?: (alert: Alert, action: string) => void;
}

export const PamAssistant: React.FC<PamAssistantProps> = ({ onAlertAction }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkNotificationPermission();
    fetchProactiveAlerts();
    setupAlertListener();
  }, []);

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast({
          title: "Notifications enabled",
          description: "You'll now receive proactive alerts from PAM"
        });
      } else {
        toast({
          title: "Notifications blocked",
          description: "You won't receive push notifications. You can enable them in your browser settings.",
          variant: "destructive"
        });
      }
    }
  };

  const showBrowserNotification = (alert: Alert) => {
    if (notificationPermission === 'granted' && 'Notification' in window) {
      const notification = new Notification(alert.title, {
        body: alert.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: alert.id,
        requireInteraction: alert.urgency === 'high'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 10 seconds unless it's high urgency
      if (alert.urgency !== 'high') {
        setTimeout(() => notification.close(), 10000);
      }
    }
  };

  const fetchProactiveAlerts = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiFetch('/api/v1/pam/proactive-monitor');

      if (!response.ok) {
        console.error('Error fetching proactive alerts');
        return;
      }

      const data = await response.json();

      // Mock alerts for demonstration since the function returns processing stats
      const mockAlerts: Alert[] = [
        {
          id: '1',
          type: 'attraction',
          title: 'Nearby Event',
          message: 'Local music festival happening 15 miles away this weekend',
          urgency: 'medium',
          actionable: true,
          data: { distance: 15, eventName: 'Music Festival', date: '2024-01-20' },
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          type: 'weather',
          title: 'Weather Alert',
          message: 'Rain expected on your planned route tomorrow',
          urgency: 'medium',
          actionable: true,
          data: { location: 'Planned Route', date: '2024-01-19' },
          timestamp: new Date().toISOString()
        },
        {
          id: '3',
          type: 'maintenance',
          title: 'Maintenance Due',
          message: 'Oil change due in 3 days',
          urgency: 'high',
          actionable: true,
          data: { task: 'Oil change', daysLeft: 3 },
          timestamp: new Date().toISOString()
        },
        {
          id: '4',
          type: 'fuel',
          title: 'Fuel Deal',
          message: 'Great fuel price $1.45/L at Shell station 2 miles away',
          urgency: 'low',
          actionable: true,
          data: { price: 1.45, station: 'Shell', distance: 2 },
          timestamp: new Date().toISOString()
        }
      ];

      setAlerts(mockAlerts);
      
      // Show browser notifications for new high urgency alerts
      mockAlerts.forEach(alert => {
        if (alert.urgency === 'high') {
          showBrowserNotification(alert);
        }
      });

    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupAlertListener = () => {
    // In a real implementation, this would listen for real-time alerts
    // For now, we'll simulate periodic updates
    const interval = setInterval(() => {
      // Randomly add a new alert occasionally
      if (Math.random() < 0.1) { // 10% chance every 30 seconds
        const newAlert: Alert = {
          id: Date.now().toString(),
          type: 'budget',
          title: 'Budget Alert',
          message: 'You\'ve spent 90% of your fuel budget this month',
          urgency: 'medium',
          actionable: true,
          data: { category: 'fuel', percentage: 90 },
          timestamp: new Date().toISOString()
        };
        
        setAlerts(prev => [newAlert, ...prev].slice(0, 10)); // Keep only latest 10
        showBrowserNotification(newAlert);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const handleAlertAction = (alert: Alert, action: string) => {
    onAlertAction?.(alert, action);
    
    // Provide feedback based on action
    switch (action) {
      case 'view_details':
        toast({
          title: "Opening details",
          description: `Getting more information about ${alert.title}`
        });
        break;
      case 'navigate':
        toast({
          title: "Opening navigation",
          description: "Launching navigation to the location"
        });
        break;
      case 'schedule':
        toast({
          title: "Scheduling reminder",
          description: "Added to your calendar"
        });
        break;
      case 'dismiss':
        dismissAlert(alert.id);
        break;
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'attraction':
        return <MapPin className="h-4 w-4" />;
      case 'weather':
        return <CloudRain className="h-4 w-4" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4" />;
      case 'budget':
      case 'fuel':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertColor = (urgency: Alert['urgency']) => {
    switch (urgency) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActionButtons = (alert: Alert) => {
    const buttons: { label: string; action: string; variant?: 'default' | 'outline' }[] = [];

    switch (alert.type) {
      case 'attraction':
        buttons.push(
          { label: 'View Details', action: 'view_details' },
          { label: 'Navigate', action: 'navigate' }
        );
        break;
      case 'weather':
        buttons.push(
          { label: 'View Forecast', action: 'view_details' },
          { label: 'Plan Route', action: 'plan_route' }
        );
        break;
      case 'maintenance':
        buttons.push(
          { label: 'Schedule', action: 'schedule' },
          { label: 'View Details', action: 'view_details', variant: 'outline' }
        );
        break;
      case 'budget':
        buttons.push(
          { label: 'View Budget', action: 'view_budget' },
          { label: 'Add Expense', action: 'add_expense', variant: 'outline' }
        );
        break;
      case 'fuel':
        buttons.push(
          { label: 'Navigate', action: 'navigate' },
          { label: 'Save Station', action: 'save_station', variant: 'outline' }
        );
        break;
    }

    return buttons;
  };

  return (
    <div className="space-y-4">
      {/* Notification Permission Banner */}
      {notificationPermission === 'default' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BellRing className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">Enable Notifications</p>
                  <p className="text-sm text-yellow-600">
                    Get real-time alerts for nearby attractions, weather changes, and maintenance reminders
                  </p>
                </div>
              </div>
              <Button onClick={requestNotificationPermission} size="sm">
                Enable
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Proactive Alerts</h3>
          {alerts.length > 0 && (
            <Badge variant="secondary">{alerts.length}</Badge>
          )}
        </div>
        <Button
          onClick={fetchProactiveAlerts}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? 'Checking...' : 'Refresh'}
        </Button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.length === 0 && !isLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No active alerts</p>
                <p className="text-sm">PAM will notify you when something important comes up</p>
              </div>
            </CardContent>
          </Card>
        )}

        {alerts.map((alert) => (
          <Card key={alert.id} className={`border-l-4 ${getAlertColor(alert.urgency)}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getAlertIcon(alert.type)}
                  <CardTitle className="text-base">{alert.title}</CardTitle>
                  <Badge 
                    variant={alert.urgency === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {alert.urgency}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-3">{alert.message}</p>
              
              {alert.actionable && (
                <div className="flex flex-wrap gap-2">
                  {getActionButtons(alert).map((button, index) => (
                    <Button
                      key={index}
                      variant={button.variant || 'default'}
                      size="sm"
                      onClick={() => handleAlertAction(alert, button.action)}
                    >
                      {button.label}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAlertAction(alert, 'dismiss')}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Done
                  </Button>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(alert.timestamp).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};