
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { user } = useAuth();
  const { settings, updateSettings, loading } = useUserSettings();

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

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
