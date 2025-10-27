-- ============================================================================
-- Diagnostic Script for transition_profiles 403 Forbidden Error
-- ============================================================================
-- Purpose: Investigate why browser gets 403 but test queries work
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Verify table exists and see its structure
-- ============================================================================
SELECT 'Step 1: Table Structure' as step;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'transition_profiles'
ORDER BY ordinal_position;

-- Expected: Should see columns like id, user_id, created_at, etc.
-- ⚠️ CRITICAL: Check if 'user_id' column exists!


-- STEP 2: Check table-level GRANT statements
-- ============================================================================
SELECT 'Step 2: Table-Level Permissions' as step;

SELECT
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'transition_profiles'
AND grantee IN ('authenticated', 'anon', 'postgres', 'service_role')
ORDER BY grantee, privilege_type;

-- Expected: Should see authenticated and anon with ALL privileges
-- If MISSING: This is the problem - run fix_transition_403_error.sql


-- STEP 3: Check RLS policies
-- ============================================================================
SELECT 'Step 3: RLS Policies' as step;

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
WHERE tablename = 'transition_profiles';

-- Expected: Should see policies for SELECT, INSERT, UPDATE, DELETE
-- ⚠️ Check the 'qual' column - this shows the RLS filter expression


-- STEP 4: Test query AS postgres (should work)
-- ============================================================================
SELECT 'Step 4: Test Query as Postgres' as step;

SELECT COUNT(*) as count_as_postgres
FROM transition_profiles;

-- Expected: Returns count (0 or more) without error


-- STEP 5: Test query AS authenticated role (THIS IS KEY!)
-- ============================================================================
SELECT 'Step 5: Test Query as Authenticated Role' as step;

-- Switch to authenticated role (simulates browser request)
SET ROLE authenticated;

-- Try to select (this will fail if GRANTs missing)
SELECT COUNT(*) as count_as_authenticated
FROM transition_profiles;

-- If this returns error 42501, GRANTs are NOT applied!
-- If this works, the problem is in RLS policy or JWT token

-- Reset role back to postgres
RESET ROLE;


-- STEP 6: Check if RLS is enabled
-- ============================================================================
SELECT 'Step 6: RLS Status' as step;

SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'transition_profiles';

-- Expected: rls_enabled = true


-- STEP 7: Check which PostgreSQL roles exist
-- ============================================================================
SELECT 'Step 7: Available Roles' as step;

SELECT
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin
FROM pg_roles
WHERE rolname IN ('postgres', 'authenticated', 'anon', 'service_role', 'authenticator')
ORDER BY rolname;

-- Expected: All 5 roles should exist


-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================
-- After running this script, check the results:
--
-- ✅ If Step 2 shows NO rows for authenticated/anon:
--    → Problem: GRANT statements never applied
--    → Solution: Run fix_transition_403_error.sql as postgres role
--
-- ✅ If Step 5 returns error 42501:
--    → Problem: authenticated role doesn't have table-level access
--    → Solution: Run GRANT statements again
--
-- ✅ If Step 5 works but browser still fails:
--    → Problem: RLS policy column mismatch or JWT token issue
--    → Solution: Check RLS policy uses correct column (user_id)
--
-- ✅ If Step 3 shows policies checking wrong column:
--    → Problem: RLS policy checks 'id' but query uses 'user_id'
--    → Solution: Fix RLS policy to match query column
-- ============================================================================
