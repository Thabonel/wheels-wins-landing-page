-- Definitive Admin Access Fix
-- This SQL creates a bulletproof is_admin() function with triple-layer protection
-- Run this in Supabase SQL Editor
-- Date: December 24, 2025

-- ============================================================================
-- STEP 1: Verify your user ID first
-- ============================================================================
SELECT id, email FROM auth.users WHERE email = 'thabonel0@gmail.com';
-- Expected: 21a2151a-cd37-41d5-a1c7-124bb05e7a6a
-- If different, update the UUID in STEP 2!

-- ============================================================================
-- STEP 2: Create the bulletproof is_admin() function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (
    -- LAYER 1: HARDWIRED ADMIN (CANNOT BE REMOVED)
    -- This user is ALWAYS admin, even if tables are deleted
    auth.uid() = '21a2151a-cd37-41d5-a1c7-124bb05e7a6a'::uuid

    OR

    -- LAYER 2: Check admin_users table (standard approach)
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )

    OR

    -- LAYER 3: Check profiles.role (legacy backup)
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
$$;

-- ============================================================================
-- STEP 3: Ensure admin_users entry exists
-- ============================================================================
INSERT INTO public.admin_users (user_id, email, role, status, created_at, updated_at)
SELECT
  id,
  email,
  'admin',
  'active',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'thabonel0@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  status = 'active',
  updated_at = NOW();

-- ============================================================================
-- STEP 4: Ensure profiles.role is set (Layer 3 backup)
-- ============================================================================
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'thabonel0@gmail.com'
);

-- ============================================================================
-- STEP 5: Create admin PostgreSQL role if needed
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin NOLOGIN;
    RAISE NOTICE 'Created admin role';
  ELSE
    RAISE NOTICE 'Admin role already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Grant permissions to admin role
-- ============================================================================
GRANT USAGE ON SCHEMA public TO admin;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_products TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_products TO authenticated;

-- ============================================================================
-- STEP 7: Verify everything works
-- ============================================================================

-- Test 1: Function exists and compiles
-- Expected: NULL (you're not authenticated in SQL Editor - this is normal)
SELECT public.is_admin() as admin_check;

-- Test 2: Admin user entry exists
-- Expected: 1 row with role='admin', status='active'
SELECT * FROM public.admin_users WHERE email = 'thabonel0@gmail.com';

-- Test 3: Profiles role is set
-- Expected: 1 row with role='admin'
SELECT id, email, role FROM public.profiles WHERE email = 'thabonel0@gmail.com';

-- Test 4: PostgreSQL role exists with grants
-- Expected: admin and authenticated should have SELECT, INSERT, UPDATE, DELETE
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'affiliate_products'
  AND grantee IN ('admin', 'authenticated')
ORDER BY grantee, privilege_type;

-- Test 5: RLS policies exist
-- Expected: Should see policies referencing is_admin() or allowing admin role
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'affiliate_products'
ORDER BY cmd, policyname;

-- ============================================================================
-- SUCCESS VERIFICATION
-- ============================================================================
-- If all 5 tests pass, you're done!
-- Next steps:
-- 1. Log out of the admin panel
-- 2. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
-- 3. Log back in
-- 4. The "Admin is in read-only mode" warning should be gone
-- 5. Test editing a product to confirm full access
-- ============================================================================
