ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS location_preferences JSONB DEFAULT '{
  "use_current_location": true,
  "auto_detect_location": false
}'::jsonb;