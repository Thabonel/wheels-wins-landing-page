-- Fix user_settings table RLS policies
-- Issue: auth.uid() works but user_settings table has permission denied errors
-- Date: 2025-01-17

-- Step 1: Check current RLS policies on user_settings
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_settings';

-- Step 2: Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "user_settings_select" ON user_settings;
DROP POLICY IF EXISTS "user_settings_insert" ON user_settings;
DROP POLICY IF EXISTS "user_settings_update" ON user_settings;
DROP POLICY IF EXISTS "user_settings_delete" ON user_settings;

-- Step 3: Create proper RLS policies for user_settings
-- Allow users to read their own settings
CREATE POLICY "user_settings_select"
ON user_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own settings
CREATE POLICY "user_settings_insert"
ON user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own settings
CREATE POLICY "user_settings_update"
ON user_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own settings
CREATE POLICY "user_settings_delete"
ON user_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Step 4: Ensure RLS is enabled
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_settings';