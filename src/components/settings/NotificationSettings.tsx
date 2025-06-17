
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, MessageSquare, Car, AlertTriangle, Cloud } from 'lucide-react';
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

  const notifications = [
    {
      key: 'email_notifications' as const,
      label: 'Email Notifications',
      description: 'Receive important updates via email',
      icon: Mail,
    },
    {
      key: 'push_notifications' as const,
      label: 'Push Notifications',
      description: 'Get notifications in your browser',
      icon: Bell,
    },
    {
      key: 'marketing_emails' as const,
      label: 'Marketing Emails',
      description: 'Receive newsletters and promotional content',
      icon: MessageSquare,
    },
    {
      key: 'trip_reminders' as const,
      label: 'Trip Reminders',
      description: 'Get reminded about upcoming trips and events',
      icon: Car,
    },
    {
      key: 'maintenance_alerts' as const,
      label: 'Maintenance Alerts',
      description: 'Receive alerts for vehicle maintenance',
      icon: AlertTriangle,
    },
    {
      key: 'weather_warnings' as const,
      label: 'Weather Warnings',
      description: 'Get notified about severe weather conditions',
      icon: Cloud,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {notifications.map(({ key, label, description, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between space-x-4">
            <div className="flex items-start space-x-3 flex-1">
              <Icon className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <Label htmlFor={key} className="text-sm font-medium">
                  {label}
                </Label>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              </div>
            </div>
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
