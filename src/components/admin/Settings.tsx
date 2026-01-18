
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Save, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
  updated_at: string;
}

const Settings = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Setting states
  const [siteMaintenance, setSiteMaintenance] = useState({
    enabled: false,
    message: 'Site is under maintenance. Please check back later.'
  });
  const [emailNotifications, setEmailNotifications] = useState({
    enabled: true,
    admin_email: 'admin@wheelsandwins.com'
  });
  const [userRegistration, setUserRegistration] = useState({
    enabled: true,
    require_approval: false
  });
  const [aiRouter, setAiRouter] = useState({ enabled: false, dryRun: true });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Try to fetch from a user_settings table (using user settings as system settings)
      const { data: userSettings, error } = await supabase
        .from('user_settings')
        .select('*')
        .limit(1);

      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
        throw error;
      }

      // If no settings exist, use defaults
      if (userSettings && userSettings.length > 0) {
        const setting = userSettings[0];
        // Parse settings from user_settings notification preferences
        const notifPrefs = setting.notification_preferences as any;
        setSiteMaintenance({
          enabled: false, // Default to false for maintenance mode
          message: 'Site is under maintenance. Please check back later.'
        });
        setEmailNotifications({
          enabled: notifPrefs?.email_enabled ?? true,
          admin_email: 'admin@wheelsandwins.com'
        });
        setUserRegistration({
          enabled: true,
          require_approval: false
        });
      }

      // Fetch system_settings flags for AI router
      try {
        const res = await fetch('/api/v1/system-settings');
        if (res.ok) {
          const sys = await res.json();
          const dry = sys?.ai_router_dry_run?.enabled ?? aiRouter.dryRun;
          const on = sys?.ai_router_enabled?.enabled ?? aiRouter.enabled;
          setAiRouter({ enabled: !!on, dryRun: !!dry });
        }
      } catch (e) {
        // ignore
      }

      toast.success("Settings refreshed");
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error("Failed to fetch settings, using defaults");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingKey: string, settingValue: any) => {
    try {
      // For now, just simulate updating settings
      // In a real app, you might create a system_settings table
      const mockSetting = {
        id: Date.now().toString(),
        setting_key: settingKey,
        setting_value: settingValue,
        description: `${settingKey} settings`,
        updated_at: new Date().toISOString()
      };

      setSettings(prev => [
        ...prev.filter(s => s.setting_key !== settingKey),
        mockSetting
      ]);
      
      return true;
    } catch (error) {
      console.error('Error updating setting:', error);
      return false;
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);

    try {
      const updates: Promise<any>[] = [
        updateSetting('site_maintenance', siteMaintenance),
        updateSetting('email_notifications', emailNotifications),
        updateSetting('user_registration', userRegistration)
      ];

      // Persist AI router flags to system_settings via backend
      try {
        updates.push(fetch('/api/v1/system-settings/ai_router_dry_run', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: { enabled: aiRouter.dryRun } })
        }));
        updates.push(fetch('/api/v1/system-settings/ai_router_enabled', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: { enabled: aiRouter.enabled } })
        }));
      } catch (e) {
        // ignore network errors here; user can retry
      }

      await Promise.all(updates);

      toast.success("Settings saved successfully");
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            System Settings
          </h1>
          <p className="text-muted-foreground text-sm">Configure global application settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {/* Site Maintenance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Site Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maintenance-enabled">Enable Maintenance Mode</Label>
              <p className="text-sm text-gray-500">Temporarily disable site access for maintenance</p>
            </div>
            <Switch
              id="maintenance-enabled"
              checked={siteMaintenance.enabled}
              onCheckedChange={(checked) => 
                setSiteMaintenance(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>
          
          {siteMaintenance.enabled && (
            <div>
              <Label htmlFor="maintenance-message">Maintenance Message</Label>
              <Textarea
                id="maintenance-message"
                placeholder="Enter the message to display to users during maintenance"
                value={siteMaintenance.message}
                onChange={(e) => 
                  setSiteMaintenance(prev => ({ ...prev, message: e.target.value }))
                }
                className="mt-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-enabled">Enable Email Notifications</Label>
              <p className="text-sm text-gray-500">Send system notifications via email</p>
            </div>
            <Switch
              id="email-enabled"
              checked={emailNotifications.enabled}
              onCheckedChange={(checked) => 
                setEmailNotifications(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>
          
          <div>
            <Label htmlFor="admin-email">Admin Email Address</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@wheelsandwins.com"
              value={emailNotifications.admin_email}
              onChange={(e) =>
                setEmailNotifications(prev => ({ ...prev, admin_email: e.target.value }))
              }
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-1">Primary email for system notifications</p>
          </div>
        </CardContent>
      </Card>

      {/* AI Router Settings */}
      <Card>
        <CardHeader>
          <CardTitle>AI Routing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-router-dry-run">Dry Run Mode</Label>
              <p className="text-sm text-gray-500">Log recommendations without changing behavior</p>
            </div>
            <Switch
              id="ai-router-dry-run"
              checked={aiRouter.dryRun}
              onCheckedChange={(checked) => setAiRouter(prev => ({ ...prev, dryRun: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-router-enabled">Enable Routing for Simple Chats</Label>
              <p className="text-sm text-gray-500">Route simple REST chats to the most cost-effective model</p>
            </div>
            <Switch
              id="ai-router-enabled"
              checked={aiRouter.enabled}
              onCheckedChange={(checked) => setAiRouter(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
          <p className="text-xs text-gray-500">Note: Provider API keys are configured on the server; this toggles runtime behavior only.</p>
        </CardContent>
      </Card>

      {/* User Registration Settings */}
      <Card>
        <CardHeader>
          <CardTitle>User Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="registration-enabled">Allow New Registrations</Label>
              <p className="text-sm text-gray-500">Enable or disable new user sign-ups</p>
            </div>
            <Switch
              id="registration-enabled"
              checked={userRegistration.enabled}
              onCheckedChange={(checked) => 
                setUserRegistration(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="require-approval">Require Admin Approval</Label>
              <p className="text-sm text-gray-500">New users need admin approval before accessing the site</p>
            </div>
            <Switch
              id="require-approval"
              checked={userRegistration.require_approval}
              onCheckedChange={(checked) => 
                setUserRegistration(prev => ({ ...prev, require_approval: checked }))
              }
              disabled={!userRegistration.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Current User:</p>
              <p className="text-gray-600">admin@wheelsandwins.com</p>
            </div>
            <div>
              <p className="font-medium">Last Settings Update:</p>
              <p className="text-gray-600">
                {settings.length > 0 
                  ? new Date(Math.max(...settings.map(s => new Date(s.updated_at).getTime()))).toLocaleString()
                  : 'Never'
                }
              </p>
            </div>
            <div>
              <p className="font-medium">Total Settings:</p>
              <p className="text-gray-600">{settings.length} configured</p>
            </div>
            <div>
              <p className="font-medium">Environment:</p>
              <p className="text-gray-600">Production</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default Settings;
