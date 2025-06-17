
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, MapPin, Activity, Database } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';

export const PrivacySettings = () => {
  const { settings, updateSettings, updating } = useUserSettings();

  if (!settings) return null;

  const handleToggle = (key: keyof typeof settings.privacy_preferences) => {
    updateSettings({
      privacy_preferences: {
        ...settings.privacy_preferences,
        [key]: !settings.privacy_preferences[key],
      },
    });
  };

  const handleVisibilityChange = (value: 'public' | 'private') => {
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
        <CardTitle>Privacy & Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Profile Visibility
          </Label>
          <Select
            value={settings.privacy_preferences.profile_visibility}
            onValueChange={handleVisibilityChange}
            disabled={updating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private - Only visible to you</SelectItem>
              <SelectItem value="public">Public - Visible to other users</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="location-sharing" className="text-sm font-medium">
                Location Sharing
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Allow sharing your location for recommendations
              </p>
            </div>
          </div>
          <Switch
            id="location-sharing"
            checked={settings.privacy_preferences.location_sharing}
            onCheckedChange={() => handleToggle('location_sharing')}
            disabled={updating}
          />
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Activity className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="activity-tracking" className="text-sm font-medium">
                Activity Tracking
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Track your app usage to improve experience
              </p>
            </div>
          </div>
          <Switch
            id="activity-tracking"
            checked={settings.privacy_preferences.activity_tracking}
            onCheckedChange={() => handleToggle('activity_tracking')}
            disabled={updating}
          />
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Database className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="data-collection" className="text-sm font-medium">
                Data Collection
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Allow anonymous data collection for analytics
              </p>
            </div>
          </div>
          <Switch
            id="data-collection"
            checked={settings.privacy_preferences.data_collection}
            onCheckedChange={() => handleToggle('data_collection')}
            disabled={updating}
          />
        </div>
      </CardContent>
    </Card>
  );
};
