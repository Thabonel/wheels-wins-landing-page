-- Fix RLS policies for user_settings, user_subscriptions, and user_profiles_extended
-- Run this in your Supabase SQL editor for the kycoklimpzkyrecbjecn project

-- First, drop conflicting policies
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;

-- Create simple, working policies for user_settings
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON user_settings;
CREATE POLICY "Enable read for users based on user_id" ON user_settings
    FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON user_settings;
CREATE POLICY "Enable insert for users based on user_id" ON user_settings
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_settings;
CREATE POLICY "Enable update for users based on user_id" ON user_settings
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON user_settings;
CREATE POLICY "Enable delete for users based on user_id" ON user_settings
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Fix user_subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON user_subscriptions;
CREATE POLICY "Enable read for users based on user_id" ON user_subscriptions
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Fix user_profiles_extended policies
DROP POLICY IF EXISTS "Users can view extended profiles" ON user_profiles_extended;
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON user_profiles_extended;
CREATE POLICY "Enable read for users based on user_id" ON user_profiles_extended
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Verify the policies are working
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN ('user_settings', 'user_subscriptions', 'user_profiles_extended')
ORDER BY tablename, cmd;