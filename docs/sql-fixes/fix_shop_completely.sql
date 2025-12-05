-- COMPLETE SHOP FIX
-- This script will reset the shop and import products cleanly

BEGIN;

-- Step 1: Remove ALL products (including duplicates)
DELETE FROM public.affiliate_products;

-- Step 2: Re-import the 81 products from import_amazon_products.sql
-- (Copy the INSERT statement from import_amazon_products.sql lines 8-258)

-- You will paste the full INSERT statement here

-- Step 3: Verification
SELECT 'Shop fix complete!' as status;
SELECT COUNT(*) as total_products FROM public.affiliate_products;
SELECT COUNT(DISTINCT asin) as unique_asins FROM public.affiliate_products;
SELECT
  COUNT(*) FILTER (WHERE is_active = true) as active_products,
  COUNT(*) FILTER (WHERE affiliate_provider = 'amazon') as amazon_products
FROM public.affiliate_products;

COMMIT;
