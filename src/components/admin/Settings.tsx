
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Save, RefreshCw, Settings as SettingsIcon, Shield, Mail, Users } from 'lucide-react';

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
  const { user } = useAuth();

  // Setting states
  const [siteMaintenance, setSiteMaintenance] = useState({
    enabled: false,
    message: ''
  });
  const [emailNotifications, setEmailNotifications] = useState({
    enabled: true,
    admin_email: ''
  });
  const [userRegistration, setUserRegistration] = useState({
    enabled: true,
    require_approval: false
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key');

      if (error) {
        toast.error(`Failed to fetch settings: ${error.message}`);
        return;
      }

      setSettings(data || []);
      
      // Parse and set individual settings
      data?.forEach(setting => {
        switch (setting.setting_key) {
          case 'site_maintenance':
            setSiteMaintenance(setting.setting_value);
            break;
          case 'email_notifications':
            setEmailNotifications(setting.setting_value);
            break;
          case 'user_registration':
            setUserRegistration(setting.setting_value);
            break;
        }
      });
    } catch (err) {
      toast.error("Network error while fetching settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingKey: string, settingValue: any) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: settingValue,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', settingKey);

      if (error) {
        throw error;
      }

      return true;
    } catch (err: any) {
      console.error(`Failed to update ${settingKey}:`, err);
      return false;
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    let success = true;

    try {
      // Update all settings
      const updates = [
        updateSetting('site_maintenance', siteMaintenance),
        updateSetting('email_notifications', emailNotifications),
        updateSetting('user_registration', userRegistration)
      ];

      const results = await Promise.all(updates);
      success = results.every(result => result);

      if (success) {
        toast.success("Settings saved successfully");
        fetchSettings(); // Refresh to get updated timestamps
      } else {
        toast.error("Some settings failed to save");
      }
    } catch (err) {
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
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Site Maintenance
          </CardTitle>
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
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
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

      {/* User Registration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Registration
          </CardTitle>
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
              <p className="text-gray-600">{user?.email}</p>
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
