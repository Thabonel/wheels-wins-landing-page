
import { useState } from 'react';

interface UserSettings {
  pam_preferences: {
    voice_enabled: boolean;
    proactive_suggestions: boolean;
    response_style: string;
    expertise_level: string;
    knowledge_sources: boolean;
  };
  integration_preferences?: {
    shop_travel_integration?: boolean;
    auto_add_purchases_to_storage?: boolean;
  };
}

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings>({
    pam_preferences: {
      voice_enabled: true,
      proactive_suggestions: false,
      response_style: 'balanced',
      expertise_level: 'intermediate',
      knowledge_sources: true,
    },
    integration_preferences: {
      shop_travel_integration: false,
      auto_add_purchases_to_storage: false,
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
