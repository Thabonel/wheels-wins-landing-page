-- Fix: Admin Cannot Update Products (affiliate_products)
-- Problem: RLS policies only allow SELECT, missing UPDATE/INSERT/DELETE for admin role
-- Date: December 24, 2025

-- Step 1: Grant UPDATE, INSERT, DELETE permissions to admin role
GRANT UPDATE ON public.affiliate_products TO admin;
GRANT INSERT ON public.affiliate_products TO admin;
GRANT DELETE ON public.affiliate_products TO admin;

-- Step 2: Create UPDATE policy for admin role
-- Admin can update any product
CREATE POLICY "admin_update_products"
ON public.affiliate_products
FOR UPDATE
USING (
  -- Check if user has admin role in JWT
  (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
  OR
  -- Or check if user is in admin_users table (backup check)
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
  )
);

-- Step 3: Create INSERT policy for admin role
-- Admin can create new products
CREATE POLICY "admin_insert_products"
ON public.affiliate_products
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
  OR
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
  )
);

-- Step 4: Create DELETE policy for admin role (optional, for completeness)
CREATE POLICY "admin_delete_products"
ON public.affiliate_products
FOR DELETE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
  OR
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
  )
);

-- Step 5: Verify policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'affiliate_products'
ORDER BY cmd, policyname;
