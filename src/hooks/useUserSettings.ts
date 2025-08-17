
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
      // Use Supabase directly for better reliability
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, create defaults
          const defaultSettings = {
            user_id: user.id,
            notification_preferences: {
              email_notifications: true,
              push_notifications: false,
              marketing_emails: false,
              trip_reminders: true,
              maintenance_alerts: true,
              weather_warnings: true,
            },
            privacy_preferences: {
              profile_visibility: 'public',
              location_sharing: false,
              activity_tracking: true,
              data_collection: false,
            },
            display_preferences: {
              theme: 'light',
              font_size: 'medium',
              high_contrast: false,
              reduced_motion: false,
              language: 'en',
            },
            regional_preferences: {
              currency: 'USD',
              units: 'imperial',
              timezone: 'America/New_York',
              date_format: 'MM/DD/YYYY',
            },
            pam_preferences: {
              voice_enabled: true,
              proactive_suggestions: true,
              response_style: 'helpful',
              expertise_level: 'intermediate',
              knowledge_sources: true,
            },
            integration_preferences: {
              shop_travel_integration: true,
              auto_add_purchases_to_storage: false,
            }
          };
          
          const { data: newSettings, error: createError } = await supabase
            .from('user_settings')
            .insert(defaultSettings)
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating default settings:', createError);
            // Use defaults even if insert fails
            setSettings(defaultSettings as UserSettings);
          } else {
            setSettings(newSettings as UserSettings);
          }
        } else {
          throw error;
        }
      } else {
        setSettings(data as UserSettings);
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
      console.error('Error details:', {
        message: err?.message,
        userId: user?.id
      });
      
      // Use default settings as fallback instead of showing error popup
      console.log('🔄 Backend settings failed, using default settings as fallback');
      const defaultSettings: UserSettings = {
        notification_preferences: {
          email_notifications: true,
          push_notifications: false,
          marketing_emails: false,
          trip_reminders: true,
          maintenance_alerts: true,
          weather_warnings: true,
        },
        privacy_preferences: {
          profile_visibility: 'public',
          location_sharing: false,
          activity_tracking: true,
          data_collection: false,
        },
        display_preferences: {
          theme: 'light',
          font_size: 'medium',
          high_contrast: false,
          reduced_motion: false,
          language: 'en',
        },
        regional_preferences: {
          currency: 'USD',
          units: 'imperial',
          timezone: 'America/New_York',
          date_format: 'MM/DD/YYYY',
        },
        pam_preferences: {
          voice_enabled: true,
          proactive_suggestions: true,
          response_style: 'helpful',
          expertise_level: 'intermediate',
          knowledge_sources: true,
        },
        integration_preferences: {
          shop_travel_integration: true,
          auto_add_purchases_to_storage: false,
        }
      };
      
      setSettings(defaultSettings);
      console.log('✅ Default settings loaded as fallback');
      
      // Only show error for critical auth issues, not for settings loading
      if (err?.message?.includes('401')) {
        toast.error('Authentication failed. Please log in again.');
      }
      // Silently handle other errors by using defaults
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user || !settings) return;
    setUpdating(true);
    try {
      // Merge with existing settings
      const updatedData = {
        ...settings,
        ...newSettings,
        user_id: user.id // Ensure user_id is always present
      };

      // Use Supabase directly for better reliability
      const { data, error } = await supabase
        .from('user_settings')
        .update(updatedData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        // If update fails because record doesn't exist, try to insert
        if (error.code === 'PGRST116') {
          const { data: insertData, error: insertError } = await supabase
            .from('user_settings')
            .insert(updatedData)
            .select()
            .single();
          
          if (insertError) {
            throw insertError;
          }
          setSettings(insertData as UserSettings);
        } else {
          throw error;
        }
      } else {
        setSettings(data as UserSettings);
      }
      
      toast.success('Settings updated successfully');
    } catch (err: any) {
      console.error('Error updating settings:', err);
      
      // Still update locally for immediate feedback
      setSettings({ ...settings, ...newSettings });
      
      // Show appropriate error message
      if (err.code === '42501') {
        toast.error('Permission denied. Please check your authentication.');
      } else if (err.code === '42P01') {
        toast.error('Settings table not found. Please contact support.');
      } else {
        toast.error('Failed to save settings. Please try again.');
      }
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
