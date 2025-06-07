
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, X } from 'lucide-react';
import { Alert } from './hooks/useRealTimeAlerts';

interface AlertsFeedProps {
  alerts: Alert[];
  onAcknowledge?: (alertId: string) => void;
}

const AlertsFeed: React.FC<AlertsFeedProps> = ({ alerts, onAcknowledge }) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'default';
      default:
        return 'outline';
    }
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  if (unacknowledgedAlerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Active Alerts ({unacknowledgedAlerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {unacknowledgedAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${getAlertColor(alert.type)}`}
          >
            <div className="flex items-center gap-3">
              {getAlertIcon(alert.type)}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{alert.title}</span>
                  <Badge variant={getBadgeVariant(alert.type)} className="text-xs">
                    {alert.type}
                  </Badge>
                </div>
                <p className="text-sm opacity-90">{alert.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            
            {onAcknowledge && (
              <Button
                onClick={() => onAcknowledge(alert.id)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-white/50"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AlertsFeed;
