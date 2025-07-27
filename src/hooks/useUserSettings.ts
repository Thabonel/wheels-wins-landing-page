
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/services/api';

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
      // Use backend API with authentication
      const response = await authenticatedFetch(`/api/v1/users/${user.id}/settings`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Settings don't exist, create defaults
          const createResponse = await authenticatedFetch(`/api/v1/users/${user.id}/settings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!createResponse.ok) {
            throw new Error('Failed to create default settings');
          }
          
          const defaultSettings = await createResponse.json();
          setSettings(defaultSettings as UserSettings);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } else {
        const data = await response.json();
        setSettings(data as UserSettings);
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
      console.error('Error details:', {
        message: err?.message,
        userId: user?.id
      });
      
      // More specific error messages
      if (err?.message?.includes('404')) {
        toast.error('Settings not found. Creating default settings...');
      } else if (err?.message?.includes('403')) {
        toast.error('Permission denied. Please try logging out and back in.');
      } else if (err?.message?.includes('401')) {
        toast.error('Authentication failed. Please log in again.');
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
      // Use backend API for settings update with authentication
      const response = await authenticatedFetch(`/api/v1/users/${user.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const updatedSettings = await response.json();
      setSettings(updatedSettings as UserSettings);
      toast.success('Settings updated');
    } catch (err: any) {
      console.error('Error updating settings:', err);
      
      // Provide user-friendly error messages
      if (err.message.includes('404')) {
        toast.error('Settings not found. Please refresh the page.');
      } else if (err.message.includes('403')) {
        toast.error('Permission denied. Please check your account status.');
      } else if (err.message.includes('401')) {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error(`Failed to update settings: ${err.message || 'Unknown error'}`);
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
