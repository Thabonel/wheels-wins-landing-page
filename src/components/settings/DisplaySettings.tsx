
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Type, Eye, Zap } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';

export const DisplaySettings = () => {
  const { settings, updateSettings, updating } = useUserSettings();

  if (!settings) return null;

  const handleToggle = (key: keyof typeof settings.display_preferences) => {
    updateSettings({
      display_preferences: {
        ...settings.display_preferences,
        [key]: !settings.display_preferences[key],
      },
    });
  };

  const handleSelectChange = (key: keyof typeof settings.display_preferences, value: string) => {
    updateSettings({
      display_preferences: {
        ...settings.display_preferences,
        [key]: value,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Display & Accessibility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </Label>
          <Select
            value={settings.display_preferences.theme}
            onValueChange={(value) => handleSelectChange('theme', value)}
            disabled={updating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System (Auto)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Font Size
          </Label>
          <Select
            value={settings.display_preferences.font_size}
            onValueChange={(value) => handleSelectChange('font_size', value)}
            disabled={updating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Eye className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="high-contrast" className="text-sm font-medium">
                High Contrast
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Increase contrast for better visibility
              </p>
            </div>
          </div>
          <Switch
            id="high-contrast"
            checked={settings.display_preferences.high_contrast}
            onCheckedChange={() => handleToggle('high_contrast')}
            disabled={updating}
          />
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Zap className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="reduced-motion" className="text-sm font-medium">
                Reduced Motion
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Minimize animations and transitions
              </p>
            </div>
          </div>
          <Switch
            id="reduced-motion"
            checked={settings.display_preferences.reduced_motion}
            onCheckedChange={() => handleToggle('reduced_motion')}
            disabled={updating}
          />
        </div>
      </CardContent>
    </Card>
  );
};
