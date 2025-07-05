
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';

export const NotificationSettings = () => {
  const { settings, updateSettings, updating } = useUserSettings();

  if (!settings) return null;

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
            <Switch
              id={key}
              checked={settings.notification_preferences[key]}
              onCheckedChange={() => handleToggle(key)}
              disabled={updating}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
