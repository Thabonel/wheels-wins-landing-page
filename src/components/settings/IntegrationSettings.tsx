
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Network } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';

export const IntegrationSettings = () => {
  const { settings, updateSettings, updating } = useUserSettings();

  if (!settings) return null;

  const handleToggle = (key: keyof NonNullable<typeof settings.integration_preferences>) => {
    updateSettings({
      integration_preferences: {
        ...settings.integration_preferences,
        [key]: !settings.integration_preferences?.[key],
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Integrations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="shop-travel">Shop & Travel Integration</Label>
          <Switch
            id="shop-travel"
            checked={settings.integration_preferences?.shop_travel_integration ?? false}
            onCheckedChange={() => handleToggle('shop_travel_integration')}
            disabled={updating}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-storage">Auto-add Purchases to Storage</Label>
          <Switch
            id="auto-storage"
            checked={settings.integration_preferences?.auto_add_purchases_to_storage ?? false}
            onCheckedChange={() => handleToggle('auto_add_purchases_to_storage')}
            disabled={updating}
          />
        </div>
      </CardContent>
    </Card>
  );
};
