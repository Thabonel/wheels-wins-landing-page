
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Truck, ShoppingCart, BarChart3, Package } from 'lucide-react';

export default function IntegrationSettings() {
  const { settings, updateSettings, updating } = useUserSettings();

  const handleIntegrationToggle = async (key: string, value: boolean) => {
    if (!settings) return;

    await updateSettings({
      integration_preferences: {
        ...settings.integration_preferences,
        [key]: value,
      },
    });
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Travel & Shop Integration
          </CardTitle>
          <p className="text-sm text-gray-600">
            Control how your travel planning and shopping features work together
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Smart Shop Integration</Label>
              <p className="text-sm text-gray-600">
                Get product recommendations based on your planned trips and travel data
              </p>
            </div>
            <Switch
              checked={settings.integration_preferences?.shop_travel_integration || false}
              onCheckedChange={(checked) => handleIntegrationToggle('shop_travel_integration', checked)}
              disabled={updating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Travel-Based Recommendations</Label>
              <p className="text-sm text-gray-600">
                Show products relevant to your destinations, routes, and travel dates
              </p>
            </div>
            <Switch
              checked={settings.integration_preferences?.travel_based_recommendations || false}
              onCheckedChange={(checked) => handleIntegrationToggle('travel_based_recommendations', checked)}
              disabled={updating || !settings.integration_preferences?.shop_travel_integration}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Auto-Add Purchases to Storage</Label>
              <p className="text-sm text-gray-600">
                Automatically add shop purchases to your RV storage inventory
              </p>
            </div>
            <Switch
              checked={settings.integration_preferences?.auto_add_purchases_to_storage || false}
              onCheckedChange={(checked) => handleIntegrationToggle('auto_add_purchases_to_storage', checked)}
              disabled={updating || !settings.integration_preferences?.shop_travel_integration}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Cross-Platform Analytics</Label>
              <p className="text-sm text-gray-600">
                Track how your purchases impact travel efficiency and provide insights
              </p>
            </div>
            <Switch
              checked={settings.integration_preferences?.cross_platform_analytics || false}
              onCheckedChange={(checked) => handleIntegrationToggle('cross_platform_analytics', checked)}
              disabled={updating || !settings.integration_preferences?.shop_travel_integration}
            />
          </div>

          {!settings.integration_preferences?.shop_travel_integration && (
            <Alert>
              <AlertDescription>
                Smart integration features are disabled. Enable "Smart Shop Integration" to access travel-based recommendations and analytics.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Integration Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <ShoppingCart className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium">Smart Recommendations</h4>
                <p className="text-sm text-gray-600">Get products tailored to your specific travel plans</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Package className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium">Inventory Sync</h4>
                <p className="text-sm text-gray-600">Seamlessly track purchases in your RV storage</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium">Travel Analytics</h4>
                <p className="text-sm text-gray-600">See how gear impacts your travel efficiency</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Truck className="w-5 h-5 text-orange-600 mt-1" />
              <div>
                <h4 className="font-medium">Route Optimization</h4>
                <p className="text-sm text-gray-600">Get gear suggestions for specific routes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
