-- Fix: Disable RLS on admin_users table
-- Purpose: Allow service role to query admin_users without restrictions
-- Date: December 24, 2025
-- Issue: Edge Function isAdmin() getting blocked, causing "read-only mode" warning

-- STEP 1: Disable RLS on admin_users table
-- This allows service_role to bypass all policies
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- STEP 2: Verify RLS is disabled
SELECT
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'admin_users';
-- Expected: rls_enabled = false

-- EXPLANATION:
-- The admin_users table contains only admin user records (role, status).
-- There's no user-specific data that needs row-level protection.
-- Service role needs full access to check admin permissions.
-- Current RLS policies already allowed public access (qual = true).
-- Disabling RLS simplifies security and fixes Edge Function 403 errors.

-- ROLLBACK (if needed):
-- ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
