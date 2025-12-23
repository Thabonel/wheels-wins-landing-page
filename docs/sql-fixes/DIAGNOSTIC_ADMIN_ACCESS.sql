-- Diagnostic Queries for Admin Read-Only Mode Issue
-- Run these in Supabase SQL Editor to identify the root cause
-- Date: December 24, 2025

-- ============================================================================
-- STEP 1: Verify which admin functions exist in the database
-- ============================================================================
SELECT
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%admin%'
ORDER BY routine_name;

-- Expected: Should see is_admin function if hardwire script was applied
-- If missing or wrong name, this is the problem

-- ============================================================================
-- STEP 2: Check what RLS policies reference
-- ============================================================================
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
WHERE tablename = 'affiliate_products'
ORDER BY policyname;

-- Look for: What function name do policies call? is_admin() or something else?

-- ============================================================================
-- STEP 3: Check if admin_users table has RLS that might block SERVICE role
-- ============================================================================
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'admin_users';

-- Check policies on admin_users (might block SERVICE role queries)
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'admin_users';

-- ============================================================================
-- STEP 4: Check profiles.role column exists
-- ============================================================================
SELECT id, email, role
FROM public.profiles
WHERE email = 'thabonel0@gmail.com';

-- Layer 3 of hardwire function checks this - does role column exist and = 'admin'?

-- ============================================================================
-- STEP 5: Verify user exists in admin_users table
-- ============================================================================
SELECT user_id, email, role, status
FROM public.admin_users
WHERE email = 'thabonel0@gmail.com';

-- Should return 1 row with role='admin', status='active'

-- ============================================================================
-- STEP 6: Test the is_admin() function directly
-- ============================================================================
-- NOTE: This will return NULL in SQL Editor (expected - no auth.uid() context)
-- But we can see if the function exists and compiles
SELECT public.is_admin();

-- Expected: NULL (not an error - you're not authenticated in SQL Editor)
-- If ERROR: function does not exist - THAT'S THE PROBLEM

-- ============================================================================
-- STEP 7: Check PostgreSQL grants
-- ============================================================================
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'affiliate_products'
  AND grantee IN ('admin', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;

-- Expected: admin, authenticated, service_role should all have SELECT, INSERT, UPDATE, DELETE

-- ============================================================================
-- ANALYSIS GUIDE
-- ============================================================================
-- If STEP 1 shows no is_admin() function:
--   → Apply hardwire_admin_access.sql
--
-- If STEP 1 shows is_admin() but STEP 2 shows policies call different function:
--   → Function name mismatch - update policies or rename function
--
-- If STEP 3 shows RLS enabled on admin_users with restrictive policies:
--   → SERVICE role might be blocked - disable RLS on admin_users or add policy
--
-- If STEP 4 shows no 'role' column:
--   → Layer 3 of hardwire function won't work - add column or remove that layer
--
-- If STEP 5 shows no row:
--   → User not in admin_users - run INSERT from hardwire script
--
-- If STEP 6 shows "function does not exist":
--   → Definitely need to apply hardwire_admin_access.sql
--
-- If STEP 7 shows missing grants for 'admin' role:
--   → Need to grant permissions to admin role
