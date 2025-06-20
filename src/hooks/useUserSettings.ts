
import { useState } from 'react';

interface UserSettings {
  pam_preferences: {
    voice_enabled: boolean;
    proactive_suggestions: boolean;
  };
}

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings>({
    pam_preferences: {
      voice_enabled: true,
      proactive_suggestions: false,
    },
  });
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    setUpdating(true);
    // Mock update
    await new Promise(resolve => setTimeout(resolve, 500));
    setSettings(prev => ({ ...prev, ...newSettings }));
    setUpdating(false);
  };

  return {
    settings,
    updateSettings,
    updating,
    loading,
  };
};
