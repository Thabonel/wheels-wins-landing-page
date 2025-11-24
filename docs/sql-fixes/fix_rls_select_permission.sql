-- Fix RLS SELECT permission denied error for affiliate_products
-- Error: permission denied for table affiliate_products (42501)
-- Root Cause: JWT has role "admin" but policies only allow "authenticated"
-- Solution: Add "admin" role to all policy TO clauses

-- Step 1: Drop ALL existing policies (using loop to handle any name variations)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'affiliate_products'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON affiliate_products', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Create PERMISSIVE policies with admin role support
-- PERMISSIVE means ANY passing policy grants access (not ALL must pass)

-- Policy 1: Let EVERYONE (anon + authenticated + admin) read active products (for public shop)
CREATE POLICY "select_active_for_all"
  ON affiliate_products
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_active = true);

-- Policy 2: Let authenticated AND admin users read ALL products (for admin panel)
CREATE POLICY "select_all_for_authenticated"
  ON affiliate_products
  AS PERMISSIVE
  FOR SELECT
  TO authenticated, admin
  USING (true);

-- Policy 3: Let authenticated AND admin users INSERT
CREATE POLICY "insert_for_authenticated"
  ON affiliate_products
  AS PERMISSIVE
  FOR INSERT
  TO authenticated, admin
  WITH CHECK (true);

-- Policy 4: Let authenticated AND admin users UPDATE
CREATE POLICY "update_for_authenticated"
  ON affiliate_products
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated, admin
  USING (true)
  WITH CHECK (true);

-- Policy 5: Let authenticated AND admin users DELETE
CREATE POLICY "delete_for_authenticated"
  ON affiliate_products
  AS PERMISSIVE
  FOR DELETE
  TO authenticated, admin
  USING (true);

-- Step 3: Verify RLS is enabled
ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify policies were created correctly
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'affiliate_products'
ORDER BY policyname;

-- Step 5: Test query (should return 81 products)
SELECT COUNT(*) AS total_products,
       COUNT(*) FILTER (WHERE is_active = true) AS active_products
FROM affiliate_products;
