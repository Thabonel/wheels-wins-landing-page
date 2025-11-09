-- Quick test to verify transition_profiles table exists
-- Run this in Supabase SQL Editor

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'transition_profiles'
) AS table_exists;

-- If table exists, check structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'transition_profiles'
ORDER BY ordinal_position;

-- Check if user has any data
SELECT COUNT(*) as profile_count FROM transition_profiles;
