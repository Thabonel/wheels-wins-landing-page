import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

const Settings = () => {
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSaveSettings = (setting: 'email' | 'twoFactor', value: boolean) => {
    setSaving(true);
    setError(null);

    // Simulate a backend save operation
    setTimeout(() => {
      // Simulate success or failure (e.g., 10% chance of failure)
      const success = Math.random() > 0.1;

      if (success) {
        toast({
          title: "Settings Saved",
          description: `${setting === 'email' ? 'Email notifications' : 'Two-factor authentication'} updated.`,
        });
      } else {
        setError("Failed to save settings.");
        toast({
          title: "Error",
          description: "Failed to save settings.",
          variant: "destructive",
        });
      }
      setSaving(false);
    }, 1000); // Simulate 1 second save time
  };

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardContent className="flex items-center justify-between space-x-4">
          <Switch
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
            className="w-6 h-6"
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between space-x-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold">Two-Factor Authentication</h2>
            <p className="text-sm text-gray-500">Enhance account security with 2FA.</p>
          </div>
          <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h2 className="text-xl font-bold">API Key Management</h2>
          <p className="text-sm text-gray-500">Manage API keys for external integrations.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;