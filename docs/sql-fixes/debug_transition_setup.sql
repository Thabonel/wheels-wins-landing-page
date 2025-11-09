-- Debug script: Check if transition_profiles table exists and has proper RLS
-- Run this in Supabase SQL Editor

-- 1. Check if table exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'transition_profiles'
    )
    THEN 'Table EXISTS ✅'
    ELSE 'Table MISSING ❌ - Run 100_transition_module.sql'
  END AS table_status;

-- 2. Check RLS policies (if table exists)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'transition_profiles'
ORDER BY policyname;

-- 3. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'transition_profiles';

-- 4. Quick fix: If table exists but RLS is wrong, re-apply policies
-- Uncomment and run if needed:

/*
ALTER TABLE transition_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can create their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can update their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can delete their own transition profile" ON transition_profiles;

CREATE POLICY "Users can view their own transition profile"
ON transition_profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own transition profile"
ON transition_profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transition profile"
ON transition_profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own transition profile"
ON transition_profiles FOR DELETE
USING (user_id = auth.uid());
*/
