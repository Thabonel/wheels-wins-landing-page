-- Diagnostic Script: Check Profiles Table Structure
-- Run this FIRST to understand the current state

-- Check profiles table columns and their data types
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check if auth_user_id column exists (from accidental migration)
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name = 'auth_user_id';

-- Check what type the id column is (should be UUID, not bigint)
SELECT data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name = 'id';

-- Check auth.users id type (should always be UUID)
SELECT data_type
FROM information_schema.columns
WHERE table_schema = 'auth'
AND table_name = 'users'
AND column_name = 'id';
