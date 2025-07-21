
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface UserSettings {
  notification_preferences: {
    email_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
    trip_reminders: boolean;
    maintenance_alerts: boolean;
    weather_warnings: boolean;
  };
  privacy_preferences: {
    profile_visibility: string;
    location_sharing: boolean;
    activity_tracking: boolean;
    data_collection: boolean;
  };
  display_preferences: {
    theme: string;
    font_size: string;
    high_contrast: boolean;
    reduced_motion: boolean;
    language: string;
  };
  regional_preferences: {
    currency: string;
    units: string;
    timezone: string;
    date_format: string;
  };
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
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    console.log('fetchSettings called, user:', user);
    
    if (!user) {
      console.log('No user found, setting loading to false');
      setLoading(false);
      return;
    }
    
    console.log('User found, fetching settings for user ID:', user.id);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: created, error: insertError } = await supabase
            .from('user_settings')
            .insert({ user_id: user.id })
            .select()
            .single();
          if (insertError) throw insertError;
          setSettings(created as unknown as UserSettings);
        } else {
          throw error;
        }
      } else {
        setSettings(data as unknown as UserSettings);
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
      console.error('Error details:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        userId: user?.id
      });
      
      // More specific error messages
      if (err?.message?.includes('relation "user_settings" does not exist')) {
        toast.error('Settings table not found. Please contact support.');
      } else if (err?.message?.includes('permission denied')) {
        toast.error('Permission denied. Please try logging out and back in.');
      } else {
        toast.error(`Failed to load settings: ${err?.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;
    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update(newSettings)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      if (data) setSettings(data as unknown as UserSettings);
      toast.success('Settings updated');
    } catch (err) {
      console.error('Error updating settings:', err);
      toast.error('Failed to update settings');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user?.id]);

  return {
    settings,
    updateSettings,
    updating,
    loading,
  };
};
