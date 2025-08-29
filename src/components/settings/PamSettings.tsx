
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Mic, BookOpen, Lightbulb } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';

export const PamSettings = () => {
  const { settings, updateSettings, updating } = useUserSettings();

  if (!settings) return null;

  const handleToggle = (key: keyof typeof settings.pam_preferences) => {
    updateSettings({
      pam_preferences: {
        ...settings.pam_preferences,
        [key]: !settings.pam_preferences[key],
      },
    });
  };

  const handleSelectChange = (key: keyof typeof settings.pam_preferences, value: string) => {
    updateSettings({
      pam_preferences: {
        ...settings.pam_preferences,
        [key]: value,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Pam AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Response Style</Label>
          <Select
            value={settings.pam_preferences.response_style}
            onValueChange={(value) => handleSelectChange('response_style', value)}
            disabled={updating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concise">Concise - Short and to the point</SelectItem>
              <SelectItem value="balanced">Balanced - Detailed but not overwhelming</SelectItem>
              <SelectItem value="detailed">Detailed - Comprehensive explanations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Expertise Level</Label>
          <Select
            value={settings.pam_preferences.expertise_level}
            onValueChange={(value) => handleSelectChange('expertise_level', value)}
            disabled={updating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner - Simple explanations</SelectItem>
              <SelectItem value="intermediate">Intermediate - Balanced detail</SelectItem>
              <SelectItem value="advanced">Advanced - Technical details</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Mic className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="voice-enabled" className="text-sm font-medium">
                Voice Responses
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Enable text-to-speech for Pam's responses
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

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <BookOpen className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="knowledge-sources" className="text-sm font-medium">
                Knowledge Sources
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Use your personal knowledge documents in responses
              </p>
            </div>
          </div>
          <Switch
            id="knowledge-sources"
            checked={settings.pam_preferences.knowledge_sources}
            onCheckedChange={() => handleToggle('knowledge_sources')}
            disabled={updating}
          />
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Lightbulb className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="proactive-suggestions" className="text-sm font-medium">
                Proactive Suggestions
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Allow Pam to offer suggestions based on your activities
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
      </CardContent>
    </Card>
  );
};
