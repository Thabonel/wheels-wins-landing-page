
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from 'react-i18next';

export const DisplaySettings = () => {
  const { settings, updateSettings, updating, loading } = useUserSettings();
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Display
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading display settings...</div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Display
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-600">
            Unable to load display settings. Please try refreshing the page.
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleToggle = (key: keyof typeof settings.display_preferences) => {
    updateSettings({
      display_preferences: {
        ...settings.display_preferences,
        [key]: !settings.display_preferences[key],
      },
    });
  };

  const handleSelect = (key: keyof typeof settings.display_preferences, value: string) => {
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
          <Monitor className="h-5 w-5" />
          Display
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Theme</Label>
          <Select
            value={settings.display_preferences.theme}
            onValueChange={(val) => handleSelect('theme', val)}
            disabled={updating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Font Size</Label>
          <Select
            value={settings.display_preferences.font_size}
            onValueChange={(val) => handleSelect('font_size', val)}
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

        {(
          [
            ['high_contrast', 'High Contrast'],
            ['reduced_motion', 'Reduced Motion'],
          ] as [keyof typeof settings.display_preferences, string][]
        ).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <Label htmlFor={key} className="text-sm font-medium">
              {label}
            </Label>
            <Switch
              id={key}
              checked={settings.display_preferences[key] as boolean}
              onCheckedChange={() => handleToggle(key)}
              disabled={updating}
            />
          </div>
        ))}

        <div className="space-y-2">
          <Label>{t('settings.language.title')}</Label>
          <Select
            value={language}
            onValueChange={(val) => {
              changeLanguage(val);
              handleSelect('language', val);
            }}
            disabled={updating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t('settings.language.english')}</SelectItem>
              <SelectItem value="es">{t('settings.language.spanish')}</SelectItem>
              <SelectItem value="fr">{t('settings.language.french')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
