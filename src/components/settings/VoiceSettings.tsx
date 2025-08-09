
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, Play, RotateCcw } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { pamVoiceService } from '@/lib/voiceService';
import { useState } from 'react';

export const VoiceSettings = () => {
  const { settings, updateSettings, updating, loading } = useUserSettings();
  const [testText] = useState("Hi! I'm Pam, your travel assistant. This is how I sound when helping you plan amazing adventures!");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Pam's Voice Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading voice settings...</div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Pam's Voice Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-600">
            Unable to load voice settings. Please try refreshing the page.
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleToggle = (key: keyof typeof settings.pam_preferences) => {
    updateSettings({
      pam_preferences: {
        ...settings.pam_preferences,
        [key]: !settings.pam_preferences[key],
      },
    });
  };

  const handleClearCache = () => {
    pamVoiceService.clearCache();
  };

  const cacheStats = pamVoiceService.getCacheStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Pam's Voice Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Volume2 className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="voice-enabled" className="text-sm font-medium">
                Enable Pam's Voice
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Let Pam speak her responses using ultra-realistic AI voice
              </p>
            </div>
          </div>
          <Switch
            id="voice-enabled"
            checked={settings.pam_preferences.voice_enabled}
            onCheckedChange={() => handleToggle('voice_enabled')}
            disabled={updating}
          />
        </div>

        {settings.pam_preferences.voice_enabled && (
          <>
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-start space-x-3 flex-1">
                <Play className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="proactive-suggestions" className="text-sm font-medium">
                    Auto-Play Responses
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically play Pam's voice responses
                  </p>
                </div>
              </div>
              <Switch
                id="proactive-suggestions"
                checked={settings.pam_preferences.proactive_suggestions}
                onCheckedChange={() => handleToggle('proactive_suggestions')}
                disabled={updating}
              />
            </div>

            {/* Voice Test */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">Test Pam's Voice</Label>
              <p className="text-sm text-gray-600 mb-3">{testText}</p>
              <p className="text-sm text-gray-500">Voice test temporarily unavailable</p>
            </div>

            {/* Cache Management */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Voice Cache</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearCache}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear Cache
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Cached voices: {cacheStats.size} | Saves bandwidth and improves performance
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
