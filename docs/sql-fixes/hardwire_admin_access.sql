-- Hardwire Admin Access - Bulletproof Triple-Layer Defense
-- Date: December 24, 2025
-- Purpose: Make thabonel0@gmail.com permanently admin, cannot be removed

-- ============================================================================
-- STEP 1: Get your user_id (VERIFY THIS FIRST!)
-- ============================================================================
SELECT id, email FROM auth.users WHERE email = 'thabonel0@gmail.com';
-- Expected output: 21a2151a-cd37-41d5-a1c7-124bb05e7a6a
-- If different, UPDATE the UUID in STEP 2 below!

-- ============================================================================
-- STEP 2: Create Bulletproof is_admin() Function
-- ============================================================================
-- This function has 3 independent layers - any ONE succeeding = admin access

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (
    -- LAYER 1: HARDWIRED ADMIN (INDESTRUCTIBLE)
    -- This user is ALWAYS admin, no matter what happens to the database
    -- Even if admin_users table is deleted, this user stays admin
    auth.uid() = '21a2151a-cd37-41d5-a1c7-124bb05e7a6a'::uuid

    OR

    -- LAYER 2: Check admin_users table (standard approach)
    -- Works for all other admin users
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )

    OR

    -- LAYER 3: Check profiles.role (legacy backup)
    -- Fallback for users with admin role in profiles table
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
$$;

-- ============================================================================
-- STEP 3: Add user to admin_users table (for visibility)
-- ============================================================================
-- This allows other admins to see you in the admin_users table
-- Even if this INSERT fails, you still have admin access via Layer 1

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
-- STEP 4: Ensure admin PostgreSQL role exists with permissions
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

-- Grant schema access
GRANT USAGE ON SCHEMA public TO admin;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant ALL permissions on affiliate_products
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_products TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_products TO authenticated;

-- ============================================================================
-- STEP 5: Verify everything works
-- ============================================================================

-- Test 1: is_admin() should return TRUE
SELECT public.is_admin() as admin_check;
-- Expected: true

-- Test 2: Check admin_users table entry
SELECT * FROM public.admin_users WHERE email = 'thabonel0@gmail.com';
-- Expected: 1 row with role='admin', status='active'

-- Test 3: Verify PostgreSQL grants
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'affiliate_products'
  AND grantee IN ('admin', 'authenticated')
ORDER BY grantee, privilege_type;
-- Expected: admin and authenticated should have SELECT, INSERT, UPDATE, DELETE

-- Test 4: Verify RLS policies
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'affiliate_products'
ORDER BY cmd, policyname;
-- Expected: Should see admin_update_products, admin_insert_products, admin_delete_products, etc.

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- You are now hardwired as admin with triple-layer protection:
--
-- Layer 1 (Hardcoded): Cannot be removed, even if tables are deleted
-- Layer 2 (admin_users): Standard approach for other admins
-- Layer 3 (profiles.role): Legacy fallback
--
-- Next steps:
-- 1. Log out of the admin panel
-- 2. Clear browser cache (Cmd+Shift+R)
-- 3. Log back in
-- 4. Test editing products - should work!
-- ============================================================================
