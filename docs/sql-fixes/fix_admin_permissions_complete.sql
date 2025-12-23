-- Complete fix for admin permissions on affiliate_products table
-- This ensures admin users can CREATE, UPDATE, DELETE products
-- Date: December 24, 2025

-- STEP 1: Create admin role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin NOLOGIN;
    RAISE NOTICE 'Created admin role';
  ELSE
    RAISE NOTICE 'Admin role already exists';
  END IF;
END $$;

-- STEP 2: Grant schema usage to admin role
GRANT USAGE ON SCHEMA public TO admin;
GRANT USAGE ON SCHEMA public TO authenticated;

-- STEP 3: Grant ALL permissions on affiliate_products to admin role
GRANT SELECT ON public.affiliate_products TO admin;
GRANT INSERT ON public.affiliate_products TO admin;
GRANT UPDATE ON public.affiliate_products TO admin;
GRANT DELETE ON public.affiliate_products TO admin;

-- STEP 4: Also grant to authenticated role (belt-and-suspenders approach)
GRANT SELECT ON public.affiliate_products TO authenticated;
GRANT INSERT ON public.affiliate_products TO authenticated;
GRANT UPDATE ON public.affiliate_products TO authenticated;
GRANT DELETE ON public.affiliate_products TO authenticated;

-- STEP 5: Verify RLS policies exist (don't drop existing ones)
-- If policies don't exist, create them

-- Check and create admin_update_products policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'affiliate_products'
    AND policyname = 'admin_update_products'
  ) THEN
    CREATE POLICY "admin_update_products"
    ON public.affiliate_products
    FOR UPDATE
    USING (
      (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
      OR
      public.is_admin()
    );
    RAISE NOTICE 'Created admin_update_products policy';
  ELSE
    RAISE NOTICE 'admin_update_products policy already exists';
  END IF;
END $$;

-- Check and create admin_insert_products policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'affiliate_products'
    AND policyname = 'admin_insert_products'
  ) THEN
    CREATE POLICY "admin_insert_products"
    ON public.affiliate_products
    FOR INSERT
    WITH CHECK (
      (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
      OR
      public.is_admin()
    );
    RAISE NOTICE 'Created admin_insert_products policy';
  ELSE
    RAISE NOTICE 'admin_insert_products policy already exists';
  END IF;
END $$;

-- Check and create admin_delete_products policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'affiliate_products'
    AND policyname = 'admin_delete_products'
  ) THEN
    CREATE POLICY "admin_delete_products"
    ON public.affiliate_products
    FOR DELETE
    USING (
      (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
      OR
      public.is_admin()
    );
    RAISE NOTICE 'Created admin_delete_products policy';
  ELSE
    RAISE NOTICE 'admin_delete_products policy already exists';
  END IF;
END $$;

-- STEP 6: Verify everything
SELECT
  'Roles' as check_type,
  rolname as name,
  CASE
    WHEN rolname = 'admin' THEN '✓ Admin role exists'
    WHEN rolname = 'authenticated' THEN '✓ Authenticated role exists'
    ELSE '✓ ' || rolname || ' exists'
  END as status
FROM pg_roles
WHERE rolname IN ('admin', 'authenticated', 'anon')

UNION ALL

SELECT
  'Grants' as check_type,
  grantee || ' - ' || privilege_type as name,
  '✓ Permission granted' as status
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'affiliate_products'
  AND grantee IN ('admin', 'authenticated')

UNION ALL

SELECT
  'Policies' as check_type,
  policyname as name,
  '✓ Policy active (' || cmd || ')' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'affiliate_products'
ORDER BY check_type, name;
