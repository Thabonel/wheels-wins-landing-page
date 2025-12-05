-- Re-import All 81 Products
-- Current state: Only 21 products in database
-- Expected: 81 products after this script

BEGIN;

-- Step 1: Delete existing products (clean slate)
DELETE FROM affiliate_products;

-- Step 2: Reset click tracking (since products will have new IDs)
DELETE FROM affiliate_product_clicks;

-- Step 3: Run the full import script
-- INSTRUCTIONS: Copy the entire INSERT statement from import_amazon_products.sql
-- Lines 8-258 (the full INSERT with all 81 products)

-- After pasting the INSERT statement here, commit the transaction
-- The verification queries below will run automatically

-- Verification
SELECT 'Import complete!' as status;
SELECT COUNT(*) as total_products FROM affiliate_products;
SELECT COUNT(DISTINCT asin) as unique_products FROM affiliate_products;
SELECT
  COUNT(*) FILTER (WHERE is_active = true) as active_products,
  COUNT(*) FILTER (WHERE is_featured = true) as featured_products
FROM affiliate_products;

COMMIT;
