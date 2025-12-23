-- Diagnostic queries to check current admin permissions
-- Run these in Supabase SQL Editor to see what's wrong

-- 1. Check if admin role exists
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin
FROM pg_roles
WHERE rolname IN ('admin', 'authenticated', 'anon', 'postgres');

-- 2. Check current grants on affiliate_products table
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'affiliate_products'
ORDER BY grantee, privilege_type;

-- 3. Check current RLS policies
SELECT schemaname, tablename, policyname, cmd as operation, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'affiliate_products'
ORDER BY cmd, policyname;

-- 4. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'affiliate_products';

-- 5. Test admin function
SELECT public.is_admin();
