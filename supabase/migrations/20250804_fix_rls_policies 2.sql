-- Fix RLS policies for user tables to prevent 403 errors
-- This migration addresses the permissions issues causing the redirect bug

-- 1. Fix user_profiles_extended permissions
ALTER TABLE public.user_profiles_extended ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own profile" ON public.user_profiles_extended;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles_extended;

-- Create new policies
CREATE POLICY "Users can read their own profile"
ON public.user_profiles_extended
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles_extended
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 2. Fix user_subscriptions permissions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own subscription" ON public.user_subscriptions;

-- Create new policies
CREATE POLICY "Users can read their own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscription"
ON public.user_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- 3. Fix user_settings permissions
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;

-- Create new policies
CREATE POLICY "Users can read their own settings"
ON public.user_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Fix user_login_history permissions
ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own login history" ON public.user_login_history;
DROP POLICY IF EXISTS "Users can read their own login history" ON public.user_login_history;

-- Create new policies
CREATE POLICY "Users can insert their own login history"
ON public.user_login_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own login history"
ON public.user_login_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Fix user_active_sessions permissions
ALTER TABLE public.user_active_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_active_sessions;

-- Create new policies
CREATE POLICY "Users can manage their own sessions"
ON public.user_active_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- 6. Ensure users table has proper RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own user record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own user record" ON public.users;

-- Create new policies
CREATE POLICY "Users can read their own user record"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own user record"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_profiles_extended TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT ON public.user_login_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_active_sessions TO authenticated;
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_extended_user_id ON public.user_profiles_extended(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_history_user_id ON public.user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_user_id ON public.user_active_sessions(user_id);