import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useUserSettings } from "@/hooks/useUserSettings";
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { DisplaySettings } from '@/components/settings/DisplaySettings';
import { RegionalSettings } from '@/components/settings/RegionalSettings';
import { IntegrationSettings } from '@/components/settings/IntegrationSettings';
import { VoiceSettings } from '@/components/settings/VoiceSettings';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { settings, updateSettings, loading } = useUserSettings();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && (name !== user.name || email !== user.email)) {
      await updateUser({ name, email });
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Trial Status Banner */}
      {/* <TrialStatusBanner /> */}

      <div className="grid gap-6">
        <VoiceSettings />
        <ProfileSettings />
        <NotificationSettings />
        <PrivacySettings />
        <DisplaySettings />
        <RegionalSettings />
        <IntegrationSettings />
      </div>
    </div>
  );
}
