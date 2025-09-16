
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { withRetry, shouldRetry, clearErrorCache, logError, getUserFriendlyMessage } from '@/utils/errorHandling';
import { getAuthDebugInfo, testDatabaseAccess } from '@/utils/authDebug';

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
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchSettings = async () => {
    console.log('fetchSettings called, user:', user);

    if (!user) {
      console.log('No user found, setting loading to false');
      setLoading(false);
      return;
    }

    const operationKey = `fetch-settings-${user.id}`;
    console.log('User found, fetching settings for user ID:', user.id);
    setLoading(true);

    // Debug authentication state before making database calls
    if (import.meta.env.MODE !== 'production') {
      const authInfo = await getAuthDebugInfo();
      console.log('🔍 Auth Debug Info before DB call:', authInfo);

      if (!authInfo.isAuthenticated) {
        console.error('❌ User not authenticated - this will cause auth.uid() to return null');
        toast.error('Authentication expired. Please sign in again.');
        setLoading(false);
        return;
      }
    }

    try {
      const result = await withRetry(
        operationKey,
        async () => {
          // Use Supabase directly for better reliability
          // Try both approaches - with and without explicit user_id filter
          let { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          // If permission denied, try without the filter (RLS will handle it)
          if (error?.code === '42501') {
            console.log('Permission denied with explicit filter, trying without...');
            console.log('🔍 Running database access test...');
            await testDatabaseAccess();

            const result = await supabase
          .from('user_settings')
          .select('*')
          .maybeSingle();
        data = result.data;
        error = result.error;
      }
      
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

  const updateSettings = async (newSettings: Partial<UserSettings>, isRetry = false): Promise<boolean> => {
    if (!user || !settings) return false;
    
    // Clear sync error when starting new update
    if (!isRetry) {
      setSyncError(null);
      setRetryCount(0);
    }
    
    setUpdating(true);
    
    // Store original settings for rollback on failure
    const originalSettings = { ...settings };
    
    // Optimistically update UI
    const updatedData = {
      ...settings,
      ...newSettings,
      user_id: user.id // Ensure user_id is always present
    };
    setSettings(updatedData);
    
    try {
      // Try to update in Supabase
      const { data, error } = await supabase
        .from('user_settings')
        .update(updatedData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        // If update fails because record doesn't exist, try to insert
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          const { data: insertData, error: insertError } = await supabase
            .from('user_settings')
            .insert(updatedData)
            .select()
            .single();
          
          if (insertError) {
            throw insertError;
          }
          setSettings(insertData as UserSettings);
          toast.success('Settings saved successfully');
          setSyncError(null);
          setRetryCount(0);
        } else {
          throw error;
        }
      } else {
        setSettings(data as UserSettings);
        toast.success('Settings saved successfully');
        setSyncError(null);
        setRetryCount(0);
      }
      return true;
    } catch (err: any) {
      console.error('Error updating settings:', err);
      
      // Rollback to original settings on error
      setSettings(originalSettings);
      
      // Determine error message
      let errorMessage = 'Failed to save settings to server.';
      
      if (err.code === '42501' || err.message?.includes('permission denied')) {
        errorMessage = 'Permission denied. Settings not saved.';
      } else if (err.code === '42P01' || err.message?.includes('relation')) {
        errorMessage = 'Database table not found. Please contact support.';
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
        errorMessage = 'Network error. Settings will be saved when connection is restored.';
      }
      
      setSyncError(errorMessage);
      
      // Auto-retry with exponential backoff for network errors
      const isNetworkError = err.message?.includes('Failed to fetch') || err.message?.includes('network');
      const shouldRetry = isNetworkError && retryCount < 3;
      
      if (shouldRetry) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        setRetryCount(prev => prev + 1);
        
        toast.info(`Retrying in ${retryDelay / 1000} seconds...`, {
          duration: retryDelay
        });
        
        setTimeout(() => {
          updateSettings(newSettings, true);
        }, retryDelay);
      } else {
        // Show error with manual retry action
        toast.error(errorMessage, {
          action: {
            label: 'Retry',
            onClick: () => {
              setRetryCount(0);
              updateSettings(newSettings);
            }
          },
          duration: 5000
        });
      }
      
      return false;
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
    syncError,
    retryCount
  };
};
