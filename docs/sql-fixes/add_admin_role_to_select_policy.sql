BEGIN;

-- First check current state
SELECT 'Current policies:' as status;
SELECT policyname, roles::text FROM pg_policies
WHERE tablename = 'affiliate_products' AND policyname = 'public_select_active';

-- Drop existing policy
DROP POLICY public_select_active ON public.affiliate_products;

-- Recreate with admin role included
CREATE POLICY public_select_active
  ON public.affiliate_products
  FOR SELECT
  TO anon, authenticated, admin
  USING (is_active = true);

-- Verify the change
SELECT 'Updated policies:' as status;
SELECT
  policyname,
  roles::text as roles,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'affiliate_products'
ORDER BY policyname;

-- Test query as if you were admin
SELECT 'Test result:' as status;
SELECT COUNT(*) as should_see_81_products FROM affiliate_products WHERE is_active = true;

COMMIT;