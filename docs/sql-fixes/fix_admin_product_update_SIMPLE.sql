-- Fix: Admin Cannot Update Products - SIMPLIFIED VERSION
-- Problem: RLS policies only allow SELECT, missing UPDATE/INSERT/DELETE for admin role
-- Date: December 24, 2025

-- Step 1: Grant UPDATE, INSERT, DELETE permissions to admin role
GRANT UPDATE ON public.affiliate_products TO admin;
GRANT INSERT ON public.affiliate_products TO admin;
GRANT DELETE ON public.affiliate_products TO admin;

-- Step 2: Create UPDATE policy for admin role
-- Admins can update any product
CREATE POLICY "admin_update_products"
ON public.affiliate_products
FOR UPDATE
USING (
  -- Check if user has admin role in JWT
  (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
  OR
  -- Or check using is_admin() helper function
  public.is_admin()
);

-- Step 3: Create INSERT policy for admin role
-- Admins can create new products
CREATE POLICY "admin_insert_products"
ON public.affiliate_products
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
  OR
  public.is_admin()
);

-- Step 4: Create DELETE policy (optional)
CREATE POLICY "admin_delete_products"
ON public.affiliate_products
FOR DELETE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
  OR
  public.is_admin()
);

-- Verify: Should show 5 policies (1 SELECT + 1 UPDATE + 1 INSERT + 1 DELETE + any others)
SELECT
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'affiliate_products'
ORDER BY cmd, policyname;
