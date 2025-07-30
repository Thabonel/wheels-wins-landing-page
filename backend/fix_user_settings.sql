-- Fix User Settings Loading Issue
-- This script ensures all users have default settings and fixes the "Failed to load settings" error

-- =========================================
-- 1. Check if user_settings table has proper structure
-- =========================================

-- Ensure user_settings table has all necessary columns
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =========================================
-- 2. Create default settings for all users
-- =========================================

-- Insert default settings for users who don't have any
INSERT INTO user_settings (
    user_id,
    theme,
    notifications_enabled,
    language,
    timezone,
    privacy_settings,
    email_notifications,
    push_notifications,
    auto_save,
    default_currency,
    distance_unit,
    temperature_unit,
    pam_voice_preference,
    pam_personality,
    pam_enabled,
    created_at,
    updated_at
)
SELECT 
    u.id,
    'light' as theme,
    true as notifications_enabled,
    'en' as language,
    'UTC' as timezone,
    '{"profile_visibility": "public", "show_location": true, "show_activity": true}'::jsonb as privacy_settings,
    true as email_notifications,
    true as push_notifications,
    true as auto_save,
    'USD' as default_currency,
    'miles' as distance_unit,
    'fahrenheit' as temperature_unit,
    'female_friendly' as pam_voice_preference,
    'helpful' as pam_personality,
    true as pam_enabled,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_settings us 
    WHERE us.user_id = u.id
);

-- =========================================
-- 3. Create trigger to auto-create settings for new users
-- =========================================

-- Function to create default settings
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (
        user_id,
        theme,
        notifications_enabled,
        language,
        timezone,
        privacy_settings,
        email_notifications,
        push_notifications,
        auto_save,
        default_currency,
        distance_unit,
        temperature_unit,
        pam_voice_preference,
        pam_personality,
        pam_enabled,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        'light',
        true,
        'en',
        'UTC',
        '{"profile_visibility": "public", "show_location": true, "show_activity": true}'::jsonb,
        true,
        true,
        true,
        'USD',
        'miles',
        'fahrenheit',
        'female_friendly',
        'helpful',
        true,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS create_user_settings_on_signup ON auth.users;

-- Create trigger for new user signups
CREATE TRIGGER create_user_settings_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_settings();

-- =========================================
-- 4. Fix RLS policies for user_settings
-- =========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;

-- Create proper RLS policies
CREATE POLICY "Users can view own settings" 
ON user_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
ON user_settings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" 
ON user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 5. Grant necessary permissions
-- =========================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_settings TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role
GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO service_role;

-- =========================================
-- 6. Create indexes for performance
-- =========================================

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- =========================================
-- 7. Verify the fix
-- =========================================

-- Count users with settings
DO $$
DECLARE
    total_users INTEGER;
    users_with_settings INTEGER;
    users_without_settings INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM auth.users;
    SELECT COUNT(*) INTO users_with_settings FROM user_settings;
    users_without_settings := total_users - users_with_settings;
    
    RAISE NOTICE '✅ User Settings Fix Complete';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Users with settings: %', users_with_settings;
    RAISE NOTICE 'Users without settings: %', users_without_settings;
    
    IF users_without_settings = 0 THEN
        RAISE NOTICE '🎉 All users now have default settings!';
    ELSE
        RAISE WARNING '⚠️ Some users still missing settings. Please investigate.';
    END IF;
END $$;