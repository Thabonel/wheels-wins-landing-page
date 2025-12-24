-- Diagnostic Query: Check admin_users RLS Configuration
-- Purpose: Identify if RLS is blocking SERVICE role queries
-- Date: December 24, 2025

-- STEP 1: Check if admin_users table has RLS enabled
SELECT
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'admin_users';

-- STEP 2: Check all RLS policies on admin_users table
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
WHERE tablename = 'admin_users'
ORDER BY policyname;

-- STEP 3: Check PostgreSQL role grants on admin_users
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'admin_users'
ORDER BY grantee, privilege_type;

-- EXPECTED RESULTS:
-- If RLS is ENABLED and no policy allows SERVICE role:
--   → Edge Function queries will fail
--   → isAdmin() returns false
--   → 403 response
--   → "Read-only mode" warning appears
--
-- FIX: Either disable RLS on admin_users OR add policy for SERVICE role
