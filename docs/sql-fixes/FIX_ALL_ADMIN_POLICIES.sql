-- Fix: Allow service_role for ALL admin operations on affiliate_products
-- Issue: RLS policies block Edge Function operations (service_role)
-- Solution: Allow service_role OR is_admin() for all operations
-- Date: December 24, 2025

-- DROP all existing admin policies
DROP POLICY IF EXISTS admin_select_all ON public.affiliate_products;
DROP POLICY IF EXISTS admin_insert ON public.affiliate_products;
DROP POLICY IF EXISTS admin_update ON public.affiliate_products;
DROP POLICY IF EXISTS admin_delete ON public.affiliate_products;

-- RECREATE policies allowing service_role OR is_admin()

-- SELECT policy (admins can see all products including inactive)
CREATE POLICY admin_select_all ON public.affiliate_products
FOR SELECT
TO authenticated, service_role
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR is_admin()
);

-- INSERT policy (admins can create products)
CREATE POLICY admin_insert ON public.affiliate_products
FOR INSERT
TO authenticated, service_role
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR is_admin()
);

-- UPDATE policy (admins can update products)
CREATE POLICY admin_update ON public.affiliate_products
FOR UPDATE
TO authenticated, service_role
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR is_admin()
)
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR is_admin()
);

-- DELETE policy (admins can delete products)
CREATE POLICY admin_delete ON public.affiliate_products
FOR DELETE
TO authenticated, service_role
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR is_admin()
);

-- Keep public read policy for active products (unchanged)
-- This already exists, don't recreate

-- Verify all policies
SELECT
    policyname,
    roles,
    cmd,
    CASE
      WHEN qual LIKE '%service_role%' THEN '✅ Includes service_role'
      ELSE '❌ Missing service_role'
    END as service_role_check
FROM pg_policies
WHERE tablename = 'affiliate_products'
ORDER BY cmd, policyname;
