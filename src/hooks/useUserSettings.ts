import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase';
import { toast } from 'sonner';

export interface UserSettings {
  id?: string;
  user_id: string;
  notification_preferences: {
    email_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
    trip_reminders: boolean;
    maintenance_alerts: boolean;
    weather_warnings: boolean;
  };
  privacy_preferences: {
    profile_visibility: 'public' | 'private';
    location_sharing: boolean;
    activity_tracking: boolean;
    data_collection: boolean;
  };
  display_preferences: {
    theme: 'light' | 'dark' | 'system';
    font_size: 'small' | 'medium' | 'large';
    high_contrast: boolean;
    reduced_motion: boolean;
    language: string;
  };
  pam_preferences: {
    response_style: 'concise' | 'balanced' | 'detailed';
    expertise_level: 'beginner' | 'intermediate' | 'advanced';
    voice_enabled: boolean;
    knowledge_sources: boolean;
    proactive_suggestions: boolean;
  };
  regional_preferences: {
    currency: string;
    units: 'metric' | 'imperial';
    timezone: string;
    date_format: string;
  };
  integration_preferences: {
    shop_travel_integration: boolean;
    auto_add_purchases_to_storage: boolean;
    travel_based_recommendations: boolean;
    cross_platform_analytics: boolean;
  };
}

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data as UserSettings);
      } else {
        // Create default settings for new user
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!user) return;

    const defaultSettings: Partial<UserSettings> = {
      user_id: user.id,
      notification_preferences: {
        email_notifications: true,
        push_notifications: true,
        marketing_emails: false,
        trip_reminders: true,
        maintenance_alerts: true,
        weather_warnings: true,
      },
      privacy_preferences: {
        profile_visibility: 'private',
        location_sharing: false,
        activity_tracking: true,
        data_collection: true,
      },
      display_preferences: {
        theme: 'system',
        font_size: 'medium',
        high_contrast: false,
        reduced_motion: false,
        language: 'en',
      },
      pam_preferences: {
        response_style: 'balanced',
        expertise_level: 'intermediate',
        voice_enabled: false,
        knowledge_sources: true,
        proactive_suggestions: true,
      },
      regional_preferences: {
        currency: 'USD',
        units: 'imperial',
        timezone: 'auto',
        date_format: 'MM/DD/YYYY',
      },
      integration_preferences: {
        shop_travel_integration: true,
        auto_add_purchases_to_storage: true,
        travel_based_recommendations: true,
        cross_platform_analytics: true,
      },
    };

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;
      setSettings(data as UserSettings);
    } catch (error) {
      console.error('Error creating default settings:', error);
      toast.error('Failed to create settings');
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user || !settings) return;

    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setSettings(data as UserSettings);
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setUpdating(false);
    }
  };

  return {
    settings,
    loading,
    updating,
    updateSettings,
    refetch: fetchSettings,
  };
};
