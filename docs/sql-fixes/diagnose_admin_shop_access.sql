-- Diagnose Admin Shop Access Issue
-- Run this in Supabase SQL Editor while logged in

-- Step 1: Check if check_user_is_admin function exists
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%admin%'
ORDER BY p.proname;

-- Step 2: Check your current auth.uid()
SELECT auth.uid() as your_user_id;

-- Step 3: Check if you're in admin_users table
SELECT *
FROM public.admin_users
WHERE user_id = auth.uid();

-- Step 4: Check ALL admin_users
SELECT user_id, role, status, created_at
FROM public.admin_users
ORDER BY created_at;

-- Step 5: Test the check_user_is_admin function directly
SELECT public.check_user_is_admin(auth.uid()) as is_admin;

-- Step 6: Check current RLS policies on affiliate_products
SELECT
    policyname,
    roles,
    cmd,
    permissive,
    qual::text as using_clause
FROM pg_policies
WHERE tablename = 'affiliate_products'
ORDER BY policyname;

-- Step 7: Count products with different conditions
SELECT
    (SELECT COUNT(*) FROM affiliate_products) as total_products,
    (SELECT COUNT(*) FROM affiliate_products WHERE is_active = true) as active_products;

-- Step 8: Test direct SELECT as your user
SELECT id, title, is_active
FROM affiliate_products
LIMIT 5;
