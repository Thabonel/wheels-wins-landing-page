ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS location_preferences JSONB DEFAULT '{
    "use_current_location": false,
    "auto_detect_location": false
}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_user_settings_location_prefs
ON public.user_settings USING GIN (location_preferences);

COMMENT ON COLUMN public.user_settings.location_preferences IS 'User location preferences including default location and auto-detection settings';
