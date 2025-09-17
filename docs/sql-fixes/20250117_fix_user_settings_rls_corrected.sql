-- CORRECTED: Fix user_settings table RLS policies
-- Issue: Multiple conflicting policies causing permission denied errors
-- Date: 2025-01-17

-- Step 1: Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
DROP POLICY IF EXISTS "allow_authenticated_access" ON user_settings;
DROP POLICY IF EXISTS "user_settings_select" ON user_settings;
DROP POLICY IF EXISTS "user_settings_insert" ON user_settings;
DROP POLICY IF EXISTS "user_settings_update" ON user_settings;
DROP POLICY IF EXISTS "user_settings_delete" ON user_settings;

-- Step 2: Create single comprehensive policy for all operations
-- This replaces multiple conflicting policies with one clear policy
CREATE POLICY "user_settings_comprehensive_access"
ON user_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 3: Ensure RLS is enabled
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify the new policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_settings';

-- Step 5: Test the policy works by trying to select (should work for authenticated users)
-- Note: This will only work if you're authenticated and have records
SELECT COUNT(*) as accessible_records FROM user_settings;