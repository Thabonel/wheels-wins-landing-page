
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';

export const PrivacySettings = () => {
  const { settings, updateSettings, updating, loading } = useUserSettings();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading privacy settings...</div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-600">
            Unable to load privacy settings. Please try refreshing the page.
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleToggle = (key: keyof typeof settings.privacy_preferences) => {
    updateSettings({
      privacy_preferences: {
        ...settings.privacy_preferences,
        [key]: !settings.privacy_preferences[key],
      },
    });
  };

  const handleSelect = (value: string) => {
    updateSettings({
      privacy_preferences: {
        ...settings.privacy_preferences,
        profile_visibility: value,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Profile Visibility</Label>
          <Select
            value={settings.privacy_preferences.profile_visibility}
            onValueChange={handleSelect}
            disabled={updating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="friends">Friends Only</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(
          [
            ['location_sharing', 'Location Sharing'],
            ['activity_tracking', 'Activity Tracking'],
            ['data_collection', 'Data Collection'],
          ] as [keyof typeof settings.privacy_preferences, string][]
        ).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <Label htmlFor={key} className="text-sm font-medium">
              {label}
            </Label>
            <Switch
              id={key}
              checked={Boolean(settings.privacy_preferences[key])}
              onCheckedChange={() => handleToggle(key)}
              disabled={updating}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
