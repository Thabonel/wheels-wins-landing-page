-- Fix: Allow service_role to UPDATE affiliate_products
-- Issue: admin_update policy only allows {authenticated}, blocking Edge Function updates
-- Date: December 24, 2025

-- Drop and recreate admin_update policy to include service_role
DROP POLICY IF EXISTS admin_update ON public.affiliate_products;

CREATE POLICY admin_update ON public.affiliate_products
FOR UPDATE
TO authenticated, service_role
USING (
  -- Allow service_role (Edge Functions already check admin)
  -- OR authenticated users who are admins
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR is_admin()
)
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR is_admin()
);

-- Verify the fix
SELECT
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'affiliate_products'
  AND policyname = 'admin_update';

-- Expected result:
-- roles: {authenticated, service_role}
-- This allows both regular admin users AND Edge Functions to update products
