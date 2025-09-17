
-- Create user_settings table for storing user preferences
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_preferences JSONB DEFAULT '{
    "email_notifications": true,
    "push_notifications": true,
    "marketing_emails": false,
    "trip_reminders": true,
    "maintenance_alerts": true,
    "weather_warnings": true
  }'::jsonb,
  privacy_preferences JSONB DEFAULT '{
    "profile_visibility": "private",
    "location_sharing": false,
    "activity_tracking": true,
    "data_collection": true
  }'::jsonb,
  display_preferences JSONB DEFAULT '{
    "theme": "system",
    "font_size": "medium",
    "high_contrast": false,
    "reduced_motion": false,
    "language": "en"
  }'::jsonb,
  pam_preferences JSONB DEFAULT '{
    "response_style": "balanced",
    "expertise_level": "intermediate",
    "voice_enabled": false,
    "knowledge_sources": true,
    "proactive_suggestions": true
  }'::jsonb,
  regional_preferences JSONB DEFAULT '{
    "currency": "USD",
    "units": "imperial",
    "timezone": "auto",
    "date_format": "MM/DD/YYYY"
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own settings" 
  ON public.user_settings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
  ON public.user_settings 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
  ON public.user_settings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to update timestamp
CREATE OR REPLACE FUNCTION public.update_user_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_timestamp
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_settings_timestamp();

-- Create account_deletion_requests table for handling account deletion
CREATE TABLE public.account_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  scheduled_deletion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own deletion requests" 
  ON public.account_deletion_requests 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deletion requests" 
  ON public.account_deletion_requests 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deletion requests" 
  ON public.account_deletion_requests 
  FOR UPDATE 
  USING (auth.uid() = user_id);
