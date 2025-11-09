-- Comprehensive Transition Profile Diagnostic
-- Run this in Supabase SQL Editor

-- 1. Check if RPC function exists
SELECT
  'FUNCTION CHECK' as test_category,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Function exists'
    ELSE '❌ Function NOT FOUND - This is the problem!'
  END as result
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'start_transition_profile';

-- 2. Check table structure (nullable fields)
SELECT
  'TABLE STRUCTURE' as test_category,
  column_name,
  is_nullable,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_name = 'transition_profiles'
AND column_name IN ('departure_date', 'current_phase', 'transition_type', 'user_id')
ORDER BY column_name;

-- 3. Check RLS policies
SELECT
  'RLS POLICIES' as test_category,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'transition_profiles'
ORDER BY cmd;

-- 4. Check GRANTs
SELECT
  'GRANTS' as test_category,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'transition_profiles'
AND grantee IN ('authenticated', 'anon')
ORDER BY grantee, privilege_type;

-- 5. Check current user
SELECT
  'CURRENT USER' as test_category,
  auth.uid() as user_id,
  CASE WHEN auth.uid() IS NOT NULL THEN '✅ Authenticated' ELSE '❌ Not authenticated' END as status;

-- 6. Check user's existing profile
SELECT
  'EXISTING PROFILE' as test_category,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ No existing profile (clean slate)'
    ELSE '⚠️  Profile exists - check for issues below'
  END as result
FROM transition_profiles
WHERE user_id = auth.uid();

-- 7. Check for constraint violations
SELECT
  'CONSTRAINT CHECK' as test_category,
  id,
  user_id,
  departure_date,
  current_phase,
  transition_type,
  archived_at,
  CASE
    WHEN departure_date >= CURRENT_DATE OR archived_at IS NOT NULL THEN '✅ Valid'
    WHEN departure_date < CURRENT_DATE AND archived_at IS NULL THEN '❌ FUTURE DEPARTURE CONSTRAINT VIOLATED'
    ELSE '⚠️  Check data'
  END as constraint_status
FROM transition_profiles
WHERE user_id = auth.uid();

-- 8. Check if user exists in auth.users
SELECT
  'AUTH USER CHECK' as test_category,
  au.id,
  au.email,
  CASE WHEN au.id IS NOT NULL THEN '✅ User exists in auth.users' ELSE '❌ User NOT found in auth.users' END as status
FROM auth.users au
WHERE au.id = auth.uid();

-- 9. Test RPC function directly (commented out - uncomment to test)
-- SELECT * FROM start_transition_profile(
--   (now() at time zone 'utc')::date + 90,
--   true
-- );

-- 10. Check RLS is enabled
SELECT
  'RLS STATUS' as test_category,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'transition_profiles';

-- 11. Check for duplicate SELECT policies
SELECT
  'DUPLICATE POLICIES' as test_category,
  COUNT(*) as select_policy_count,
  CASE
    WHEN COUNT(*) > 1 THEN '⚠️  Multiple SELECT policies detected - may cause conflicts'
    WHEN COUNT(*) = 1 THEN '✅ One SELECT policy'
    ELSE '❌ No SELECT policy'
  END as status
FROM pg_policies
WHERE tablename = 'transition_profiles'
AND cmd = 'SELECT';
