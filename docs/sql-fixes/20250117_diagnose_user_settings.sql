-- Diagnostic script for user_settings table RLS issues
-- Run this to understand what's causing the permission denied errors

-- 1. Check if user_settings table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_settings'
) AS table_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_settings'
ORDER BY ordinal_position;

-- 3. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'user_settings';

-- 4. List all current policies on user_settings
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_settings';

-- 5. Check current user context (should show auth.uid())
SELECT
    auth.uid() as current_user_id,
    auth.email() as current_user_email,
    current_user as postgres_user;

-- 6. Try to select from user_settings (this might fail)
SELECT count(*) as total_records FROM user_settings;

-- 7. Check if there are any records in user_settings
SELECT user_id, created_at
FROM user_settings
LIMIT 5;

-- 8. Check auth.users table to verify user exists
SELECT id, email, created_at
FROM auth.users
WHERE id = auth.uid();

-- 9. Test policy conditions manually
SELECT
    auth.uid() as auth_uid,
    user_id,
    auth.uid() = user_id as policy_should_allow
FROM user_settings
WHERE user_id = auth.uid()
LIMIT 1;