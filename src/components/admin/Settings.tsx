
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase";
import { useAuth } from "@/context/AuthContext";

const Settings = () => {
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('email_notifications, two_factor_auth')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error("Error loading settings:", error);
      } else if (data) {
        setEmailNotifications(data.email_notifications);
        setTwoFactor(data.two_factor_auth);
      }
    };

    loadSettings();
  }, [user]);

  const handleSaveSettings = async (key: 'email_notifications' | 'two_factor_auth', value: boolean) => {
    if (!user) return;

    setSaving(true);

    const updatedSettings = {
      user_id: user.id,
      [key]: value,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('settings')
      .upsert(updatedSettings, { onConflict: 'user_id' });

    setSaving(false);

    if (error) {
      toast({ title: "Error saving setting", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Setting saved successfully." });
    }
  };

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Email Notifications</h3>
              <p className="text-sm text-gray-500">Receive email notifications for important updates.</p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={(checked) => {
                setEmailNotifications(checked);
                handleSaveSettings('email_notifications', checked);
              }}
              disabled={!user || saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500">Enhance account security with 2FA.</p>
          </div>
          <Switch
            checked={twoFactor}
            onCheckedChange={(checked) => {
              setTwoFactor(checked);
              handleSaveSettings('two_factor_auth', checked);
            }}
            disabled={!user || saving}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-medium">API Key Management</h3>
          <p className="text-sm text-gray-500">Manage API keys for external integrations.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
