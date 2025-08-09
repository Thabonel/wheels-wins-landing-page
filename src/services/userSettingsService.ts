import { supabase } from '@/integrations/supabase/client';

const DEFAULT_SETTINGS = {
  notification_preferences: {
    email: true,
    push: true,
    sms: false
  },
  privacy_preferences: {
    profile_visibility: 'public',
    location_sharing: false
  },
  display_preferences: {
    theme: 'light',
    language: 'en'
  },
  pam_preferences: {
    voice_enabled: true,
    auto_suggestions: true
  },
  budget_settings: {
    weeklyBudget: 300,
    monthlyBudget: 1200,
    yearlyBudget: 14400
  }
};

export async function getUserSettings(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No settings found, create default
      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          ...DEFAULT_SETTINGS
        })
        .select()
        .single();

      if (insertError) {
        console.warn('Could not create default settings:', insertError);
        return { user_id: userId, ...DEFAULT_SETTINGS };
      }
      
      return newSettings;
    }

    if (error) {
      console.warn('Error loading user settings:', error);
      return { user_id: userId, ...DEFAULT_SETTINGS };
    }
    
    // Merge with defaults to ensure all fields exist
    return { 
      ...DEFAULT_SETTINGS, 
      ...data,
      // Ensure budget_settings exists and has all required fields
      budget_settings: {
        ...DEFAULT_SETTINGS.budget_settings,
        ...(data.budget_settings || {})
      }
    };
  } catch (error) {
    console.warn('Error in getUserSettings:', error);
    // Return defaults on error
    return { user_id: userId, ...DEFAULT_SETTINGS };
  }
}

export async function updateUserSettings(userId: string, settings: Partial<typeof DEFAULT_SETTINGS>) {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
}