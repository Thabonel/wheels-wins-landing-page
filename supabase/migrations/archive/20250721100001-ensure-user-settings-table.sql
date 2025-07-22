-- Ensure user_settings table exists with proper structure and RLS policies
-- This fixes frontend settings loading issues

-- Create user_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    notification_preferences JSONB DEFAULT '{
        "email_notifications": true,
        "push_notifications": true,
        "marketing_emails": false,
        "trip_reminders": true,
        "maintenance_alerts": true,
        "weather_warnings": true
    }'::jsonb,
    privacy_preferences JSONB DEFAULT '{
        "profile_visibility": "public",
        "location_sharing": true,
        "activity_tracking": true,
        "data_collection": true
    }'::jsonb,
    display_preferences JSONB DEFAULT '{
        "theme": "system",
        "font_size": "medium",
        "language": "en",
        "high_contrast": false,
        "reduced_motion": false
    }'::jsonb,
    voice_preferences JSONB DEFAULT '{
        "voice_responses_enabled": false,
        "preferred_voice": "default",
        "speech_rate": "normal"
    }'::jsonb,
    regional_preferences JSONB DEFAULT '{
        "currency": "USD",
        "units": "imperial",
        "timezone": "America/New_York",
        "date_format": "MM/DD/YYYY"
    }'::jsonb,
    pam_preferences JSONB DEFAULT '{
        "voice_enabled": false,
        "proactive_suggestions": true,
        "response_style": "balanced",
        "expertise_level": "intermediate",
        "knowledge_sources": true
    }'::jsonb,
    integration_preferences JSONB DEFAULT '{
        "shop_travel_integration": true,
        "auto_add_purchases_to_storage": false
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_read_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_insert_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_update_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_delete_own_settings" ON public.user_settings;

-- Create comprehensive policies
CREATE POLICY "user_settings_select_own" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert_own" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update_own" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_delete_own" ON public.user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_notification_prefs ON public.user_settings USING GIN (notification_preferences);
CREATE INDEX IF NOT EXISTS idx_user_settings_privacy_prefs ON public.user_settings USING GIN (privacy_preferences);
CREATE INDEX IF NOT EXISTS idx_user_settings_display_prefs ON public.user_settings USING GIN (display_preferences);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_settings_updated_at_trigger ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at_trigger
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

COMMENT ON TABLE public.user_settings IS 'User preferences and settings for all app features';
COMMENT ON COLUMN public.user_settings.user_id IS 'References the authenticated user';
COMMENT ON COLUMN public.user_settings.notification_preferences IS 'User notification preferences';
COMMENT ON COLUMN public.user_settings.privacy_preferences IS 'User privacy settings';
COMMENT ON COLUMN public.user_settings.display_preferences IS 'User display and theme preferences';
COMMENT ON COLUMN public.user_settings.integration_preferences IS 'User preferences for integrations between features';