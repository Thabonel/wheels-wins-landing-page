
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserSettings } from '@/hooks/useUserSettings';

export const NotificationSettings = () => {
  const { settings, updateSettings, updating, loading, syncError, retryCount } = useUserSettings();
  
  console.log('NotificationSettings render:', { settings, loading, updating });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading notification settings...</div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-600">
            Unable to load notification settings. Please try refreshing the page.
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleToggle = (key: keyof typeof settings.notification_preferences) => {
    updateSettings({
      notification_preferences: {
        ...settings.notification_preferences,
        [key]: !settings.notification_preferences[key],
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {syncError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{syncError}</span>
              {retryCount > 0 && (
                <span className="text-sm ml-2">
                  <RefreshCw className="inline h-3 w-3 mr-1 animate-spin" />
                  Retrying...
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {(
          [
            ['email_notifications', 'Email Notifications'],
            ['push_notifications', 'Push Notifications'],
            ['marketing_emails', 'Marketing Emails'],
            ['trip_reminders', 'Trip Reminders'],
            ['maintenance_alerts', 'Maintenance Alerts'],
            ['weather_warnings', 'Weather Warnings'],
          ] as [keyof typeof settings.notification_preferences, string][]
        ).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <Label htmlFor={key} className="text-sm font-medium">
              {label}
            </Label>
            <div className="flex items-center gap-2">
              <Switch
                id={key}
                checked={settings.notification_preferences[key]}
                onCheckedChange={() => handleToggle(key)}
                disabled={updating || !!syncError}
              />
              {updating && key === Object.keys(settings.notification_preferences).find(k => 
                settings.notification_preferences[k as keyof typeof settings.notification_preferences] !== 
                settings.notification_preferences[key]
              ) && (
                <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
