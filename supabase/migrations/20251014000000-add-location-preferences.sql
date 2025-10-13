-- Add location_preferences column to user_settings table
-- Fixes "Failed to save settings" error when updating location sharing preferences

-- Add location_preferences column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_settings'
        AND column_name = 'location_preferences'
    ) THEN
        ALTER TABLE public.user_settings
        ADD COLUMN location_preferences JSONB DEFAULT '{
            "use_current_location": false,
            "auto_detect_location": false
        }'::jsonb;
    END IF;
END $$;

-- Add GIN index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_user_settings_location_prefs
ON public.user_settings USING GIN (location_preferences);

-- Add helpful comment
COMMENT ON COLUMN public.user_settings.location_preferences IS 'User location preferences including default location and auto-detection settings';
