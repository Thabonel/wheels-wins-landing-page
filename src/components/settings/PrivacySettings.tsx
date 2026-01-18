
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const PrivacySettings = () => {
  const { settings, updateSettings, updating, loading, syncError, retryCount } = useUserSettings();
  const { user, profile } = useAuth();
  const [contentPreferences, setContentPreferences] = useState({
    show_personalized_safety: false,
    show_personalized_community: false,
    share_gender_with_groups: false,
  });
  const [updatingContent, setUpdatingContent] = useState(false);

  // Load content preferences from profile
  useEffect(() => {
    if (profile?.content_preferences) {
      setContentPreferences(profile.content_preferences as any);
    }
  }, [profile]);

  const handleContentPreferenceToggle = async (key: keyof typeof contentPreferences) => {
    if (!user) return;

    setUpdatingContent(true);
    const newPreferences = {
      ...contentPreferences,
      [key]: !contentPreferences[key],
    };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ content_preferences: newPreferences })
        .eq('id', user.id);

      if (error) throw error;

      setContentPreferences(newPreferences);
      toast.success('Content preferences updated');
    } catch (error: any) {
      console.error('Error updating content preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setUpdatingContent(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
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
          <CardTitle>Privacy</CardTitle>
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
        
        <div className="space-y-2">
          <Label>Profile Visibility</Label>
          <Select
            value={settings.privacy_preferences.profile_visibility}
            onValueChange={handleSelect}
            disabled={updating || !!syncError}
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
            <div className="flex items-center gap-2">
              <Switch
                id={key}
                checked={Boolean(settings.privacy_preferences[key])}
                onCheckedChange={() => handleToggle(key)}
                disabled={updating || !!syncError}
              />
              {updating && (
                <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />
              )}
            </div>
          </div>
        ))}

        {/* Personalized Content Preferences */}
        <div className="mt-8 pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">Personalized Content</h3>
          <p className="text-sm text-gray-600 mb-4">
            Control what personalized content you want to see based on your profile
          </p>

          <div className="space-y-4">
            {/* Show Personalized Safety Resources */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="show_personalized_safety" className="text-sm font-medium">
                    Show personalized safety resources
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          Get safety tips and resources relevant to your travel style and identity.
                          Requires gender identity to be set in your profile.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-gray-500">
                  Empowerment-focused content tailored to your needs
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show_personalized_safety"
                  checked={contentPreferences.show_personalized_safety}
                  onCheckedChange={() => handleContentPreferenceToggle('show_personalized_safety')}
                  disabled={updatingContent}
                />
                {updatingContent && (
                  <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />
                )}
              </div>
            </div>

            {/* Show Personalized Community Groups */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="show_personalized_community" className="text-sm font-medium">
                    Show relevant community groups
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          Discover groups and activities that match your interests.
                          Based on your selected interests in your profile.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-gray-500">
                  Get recommendations based on your interests
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show_personalized_community"
                  checked={contentPreferences.show_personalized_community}
                  onCheckedChange={() => handleContentPreferenceToggle('show_personalized_community')}
                  disabled={updatingContent}
                />
                {updatingContent && (
                  <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />
                )}
              </div>
            </div>

            {/* Share Gender with Community Groups */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="share_gender_with_groups" className="text-sm font-medium">
                    Share gender with community groups
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          Allows gender-specific groups to appear in your recommendations.
                          Your gender is still private and only used for matching.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-gray-500">
                  Enable to see gender-specific groups in recommendations
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="share_gender_with_groups"
                  checked={contentPreferences.share_gender_with_groups}
                  onCheckedChange={() => handleContentPreferenceToggle('share_gender_with_groups')}
                  disabled={updatingContent}
                />
                {updatingContent && (
                  <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />
                )}
              </div>
            </div>
          </div>

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              All personalized content is opt-in. Your gender and personal information remain private by default.
              You control what you share and see.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};
