import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MapPin, RefreshCw } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/context/AuthContext';
import { locationService } from '@/services/locationService';

export const LocationSettings = () => {
  const { settings, updateSettings, updating, loading, syncError, retryCount } = useUserSettings();
  const { user } = useAuth();

  if (loading || !settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading location settings...</div>
        </CardContent>
      </Card>
    );
  }

  const togglePrecise = async () => {
    await updateSettings({
      location_preferences: {
        ...(settings.location_preferences || {}),
        use_current_location: !settings.location_preferences?.use_current_location,
        auto_detect_location: !settings.location_preferences?.use_current_location,
      },
    });
  };

  const toggleMapShare = async () => {
    await updateSettings({
      privacy_preferences: {
        ...settings.privacy_preferences,
        location_sharing: !settings.privacy_preferences.location_sharing,
      },
    });
  };

  const openConsent = () => {
    window.dispatchEvent(new Event('open-location-consent'));
  };

  const forgetLocation = async () => {
    if (!user?.id) return;
    try {
      await locationService.setUserOffline(user.id);
    } catch (e) {
      // ignore UI error
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="precise" className="text-sm font-medium">
            Use precise location (weather & nearby)
          </Label>
          <div className="flex items-center gap-2">
            <Switch
              id="precise"
              checked={Boolean(settings.location_preferences?.use_current_location)}
              onCheckedChange={togglePrecise}
              disabled={updating}
            />
            {updating && <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="mapshare" className="text-sm font-medium">
            Share on community map
          </Label>
          <div className="flex items-center gap-2">
            <Switch
              id="mapshare"
              checked={Boolean(settings.privacy_preferences.location_sharing)}
              onCheckedChange={toggleMapShare}
              disabled={updating}
            />
            {updating && <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={openConsent}
            className="rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Review consent
          </button>
          <button
            type="button"
            onClick={forgetLocation}
            className="rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Forget my location
          </button>
          {syncError && (
            <span className="text-xs text-red-600">{syncError}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationSettings;

