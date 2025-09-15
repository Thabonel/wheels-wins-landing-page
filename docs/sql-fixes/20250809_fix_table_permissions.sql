-- Fix table permissions for user access
-- These tables are showing "permission denied" errors in production

-- Enable RLS on tables if not already enabled
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_savings_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles_extended;
DROP POLICY IF EXISTS "Users can view own savings events" ON pam_savings_events;

-- Create proper RLS policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create proper RLS policies for user_settings
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create proper RLS policies for user_profiles_extended
CREATE POLICY "Users can view own extended profile"
  ON user_profiles_extended FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own extended profile"
  ON user_profiles_extended FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own extended profile"
  ON user_profiles_extended FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create table for pam_savings_events if it doesn't exist
CREATE TABLE IF NOT EXISTS pam_savings_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id UUID,
  savings_type VARCHAR(100) NOT NULL,
  predicted_savings DECIMAL(10,2),
  actual_savings DECIMAL(10,2) NOT NULL,
  saved_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_pam_savings_user_date ON pam_savings_events(user_id, saved_date);

-- Create RLS policies for pam_savings_events
CREATE POLICY "Users can view own savings events"
  ON pam_savings_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings events"
  ON pam_savings_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings events"
  ON pam_savings_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles_extended TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pam_savings_events TO authenticated;

-- Grant usage on sequences if they exist
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;