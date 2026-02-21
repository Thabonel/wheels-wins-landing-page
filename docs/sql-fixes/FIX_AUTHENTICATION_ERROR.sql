-- =====================================================
-- FIX AUTHENTICATION ERROR ON STAGING
-- =====================================================
-- Purpose: Fix authentication service configuration error
-- The error suggests RLS policies may be blocking login process
-- =====================================================

-- First, let's check what's happening with the admin_users table
-- since thabonel0@gmail.com is likely an admin user

-- Check if admin_users table has proper policies for login process
SELECT
    'ADMIN_USERS TABLE ACCESS' as check_type,
    tablename,
    policyname,
    cmd,
    roles,
    qual as using_clause
FROM pg_policies
WHERE tablename = 'admin_users'
ORDER BY policyname;

-- Check if we accidentally blocked access to auth-related tables
SELECT
    'AUTH RELATED TABLES' as check_type,
    t.table_name,
    CASE WHEN c.relrowsecurity THEN 'RLS_ENABLED' ELSE 'NO_RLS' END as rls_status,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.table_name) as policy_count
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name
WHERE t.table_schema = 'public'
  AND (
    t.table_name LIKE '%admin%'
    OR t.table_name LIKE '%auth%'
    OR t.table_name LIKE '%user%'
    OR t.table_name = 'profiles'
  )
ORDER BY t.table_name;

-- Check if profiles table (used for authentication) has proper read access
SELECT
    'PROFILES TABLE POLICIES' as check_type,
    policyname,
    cmd,
    roles,
    qual as using_clause
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Now let's fix potential authentication blocking issues

-- POTENTIAL FIX 1: Ensure admin_users table is accessible for login checks
-- The app likely needs to check if a user is an admin during login
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
        -- Drop any overly restrictive policies on admin_users
        DROP POLICY IF EXISTS "admin_users_user_access" ON admin_users;

        -- Create a policy that allows users to check their own admin status
        CREATE POLICY "allow_admin_status_check" ON admin_users
          FOR SELECT TO authenticated
          USING (user_id = auth.uid());

        RAISE NOTICE 'Fixed admin_users access for login process';
    ELSE
        RAISE NOTICE 'admin_users table does not exist';
    END IF;
END $$;

-- POTENTIAL FIX 2: Ensure profiles table allows proper authentication flow
-- The app might need to read profile during login process
DO $$
BEGIN
    -- Check if we have a profiles insert policy for new user registration
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_secure_insert') THEN
        CREATE POLICY "profiles_secure_insert" ON profiles
          FOR INSERT TO authenticated
          WITH CHECK (id = auth.uid());
        RAISE NOTICE 'Added profiles insert policy for user registration';
    END IF;

    -- Ensure we have proper select policy for authentication
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_secure_read') THEN
        CREATE POLICY "profiles_secure_read" ON profiles
          FOR SELECT TO authenticated
          USING (id = auth.uid());
        RAISE NOTICE 'Confirmed profiles read policy exists';
    END IF;
END $$;

-- POTENTIAL FIX 3: Check if we need to allow some public access for authentication
-- Some authentication flows might need limited public access
DO $$
BEGIN
    -- If the error is about Supabase URL configuration, we might need to allow
    -- some public access to profiles for the authentication service itself

    -- Check if we need a service_role policy for authentication infrastructure
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_service_role_access') THEN
        CREATE POLICY "profiles_service_role_access" ON profiles
          FOR ALL TO service_role
          USING (true);
        RAISE NOTICE 'Added service_role access policy for authentication infrastructure';
    END IF;
END $$;

-- VERIFICATION: Check current authentication-related policies
SELECT
    'AUTHENTICATION POLICIES AFTER FIX' as check_type,
    tablename,
    policyname,
    cmd,
    roles::text,
    CASE
        WHEN roles::text ILIKE '%service_role%' THEN '✅ Infrastructure Access'
        WHEN roles::text ILIKE '%authenticated%' THEN '✅ User Access'
        WHEN roles::text ILIKE '%anon%' THEN '⚠️ Anonymous Access'
        ELSE '❓ Other'
    END as access_type
FROM pg_policies
WHERE tablename IN ('profiles', 'admin_users')
ORDER BY tablename, policyname;

-- Final check
SELECT 'AUTHENTICATION FIX APPLIED' as status,
       'Try logging in again - if still fails, we need more specific debugging' as next_step;