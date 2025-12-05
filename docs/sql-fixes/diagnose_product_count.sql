-- Diagnose why only 21 products show instead of 81

-- Check total count
SELECT COUNT(*) as total_products FROM affiliate_products;

-- Check by status
SELECT
  is_active,
  COUNT(*) as count
FROM affiliate_products
GROUP BY is_active;

-- Check by provider
SELECT
  affiliate_provider,
  COUNT(*) as count
FROM affiliate_products
GROUP BY affiliate_provider;

-- Check what the shop query returns
SELECT COUNT(*) as shop_query_result
FROM affiliate_products
WHERE affiliate_provider = 'amazon'
  AND is_active = true;

-- Show all products with key info
SELECT
  id,
  title,
  asin,
  affiliate_provider,
  is_active,
  sort_order,
  created_at
FROM affiliate_products
ORDER BY sort_order ASC;

-- Check for duplicates
SELECT
  asin,
  COUNT(*) as count
FROM affiliate_products
WHERE asin IS NOT NULL
GROUP BY asin
HAVING COUNT(*) > 1;

-- Check if products have NULL asins (shouldn't be deduplicated)
SELECT COUNT(*) as products_with_null_asin
FROM affiliate_products
WHERE asin IS NULL;
