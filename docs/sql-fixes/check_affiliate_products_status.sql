-- Diagnostic query to check affiliate_products table status
-- Run this in Supabase SQL Editor to diagnose issues

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'affiliate_products'
) AS table_exists;

-- 2. Count total products
SELECT COUNT(*) AS total_products FROM affiliate_products;

-- 3. Count by affiliate_provider
SELECT
  affiliate_provider,
  COUNT(*) AS count,
  COUNT(*) FILTER (WHERE is_active = true) AS active_count,
  COUNT(*) FILTER (WHERE is_active = false) AS inactive_count
FROM affiliate_products
GROUP BY affiliate_provider;

-- 4. Sample of first 5 products
SELECT
  id,
  title,
  asin,
  affiliate_provider,
  category,
  price,
  currency,
  is_active,
  sort_order,
  created_at
FROM affiliate_products
ORDER BY sort_order, created_at
LIMIT 5;

-- 5. Check RLS policies
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
ORDER BY policyname;

-- 6. Check if RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'affiliate_products';
