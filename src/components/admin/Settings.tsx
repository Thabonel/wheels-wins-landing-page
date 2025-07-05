
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Save, RefreshCw, Settings as SettingsIcon, Shield, Mail, Users } from 'lucide-react';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
  updated_at: string;
}

const Settings = () => {
  // Mock system settings data
  const mockSettings: SystemSetting[] = [
    {
      id: '1',
      setting_key: 'site_maintenance',
      setting_value: { enabled: false, message: 'Site is under maintenance. Please check back later.' },
      description: 'Enable site maintenance mode',
      updated_at: '2024-07-04T15:30:00Z'
    },
    {
      id: '2', 
      setting_key: 'email_notifications',
      setting_value: { enabled: true, admin_email: 'admin@wheelsandwins.com' },
      description: 'Email notification settings',
      updated_at: '2024-07-03T10:20:00Z'
    },
    {
      id: '3',
      setting_key: 'user_registration',
      setting_value: { enabled: true, require_approval: false },
      description: 'User registration settings',
      updated_at: '2024-07-02T14:45:00Z'
    }
  ];

  const [settings, setSettings] = useState<SystemSetting[]>(mockSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Setting states - initialized with mock data
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

  const fetchSettings = async () => {
    // Mock refresh - simulate loading
    setLoading(true);
    setTimeout(() => {
      setSettings(mockSettings);
      // Reset to mock values
      setSiteMaintenance({ enabled: false, message: 'Site is under maintenance. Please check back later.' });
      setEmailNotifications({ enabled: true, admin_email: 'admin@wheelsandwins.com' });
      setUserRegistration({ enabled: true, require_approval: false });
      setLoading(false);
      toast.success("Settings refreshed");
    }, 1000);
  };

  const updateSetting = async (settingKey: string, settingValue: any) => {
    // Mock update - update local state
    setSettings(prev => 
      prev.map(setting => 
        setting.setting_key === settingKey 
          ? { ...setting, setting_value: settingValue, updated_at: new Date().toISOString() }
          : setting
      )
    );
    return true;
  };

  const handleSaveSettings = async () => {
    setSaving(true);

    try {
      // Mock save - update all settings
      await Promise.all([
        updateSetting('site_maintenance', siteMaintenance),
        updateSetting('email_notifications', emailNotifications),
        updateSetting('user_registration', userRegistration)
      ]);

      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // Initialize with mock data - already set in state
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
