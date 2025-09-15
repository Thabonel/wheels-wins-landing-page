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
  regional_preferences JSONB DEFAULT '{
    "currency": "USD",
    "units": "imperial",
    "timezone": "America/New_York",
    "date_format": "MM/DD/YYYY"
  }'::jsonb,
  pam_preferences JSONB DEFAULT '{
    "voice_enabled": true,
    "proactive_suggestions": true,
    "response_style": "balanced",
    "expertise_level": "intermediate",
    "knowledge_sources": true
  }'::jsonb,
  integration_preferences JSONB DEFAULT '{
    "shop_travel_integration": true,
    "auto_add_purchases_to_storage": false
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Enable Row Level Security (if not already enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_settings'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON public.user_settings;

-- Create policies (safe to run even if they already exist)
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON public.user_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW 
  EXECUTE FUNCTION update_user_settings_updated_at();

-- Grant permissions to authenticated users
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;