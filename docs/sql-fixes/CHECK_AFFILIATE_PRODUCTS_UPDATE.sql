-- Check affiliate_products RLS policies for UPDATE operations
-- Issue: Admin can view products but cannot update them

-- STEP 1: Check if RLS is enabled
SELECT
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'affiliate_products';

-- STEP 2: Check all RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'affiliate_products'
ORDER BY cmd, policyname;

-- STEP 3: Check grants for service_role
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'affiliate_products'
  AND grantee = 'service_role'
ORDER BY privilege_type;
