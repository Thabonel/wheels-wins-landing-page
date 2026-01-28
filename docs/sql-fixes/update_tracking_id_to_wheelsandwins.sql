-- Migration: Update all affiliate products to use wheelsandwins-22 tracking ID
-- Date: 2026-01-28
-- Purpose: Consolidate affiliate tracking to use consistent wheelsandwins-22 Store ID
--          Previously had mix of wheelsandwins-22 and unimogcommuni-22

-- Update all regional_urls to use wheelsandwins-22
UPDATE affiliate_products
SET regional_urls = replace(regional_urls::text, 'unimogcommuni-22', 'wheelsandwins-22')::jsonb,
    updated_at = NOW()
WHERE regional_urls::text LIKE '%unimogcommuni-22%'
  AND is_active = true;

-- Verification query (run after update)
SELECT
  COUNT(*) as total_products,
  COUNT(CASE WHEN affiliate_url LIKE '%wheelsandwins-22%' THEN 1 END) as correct_affiliate_url,
  COUNT(CASE WHEN regional_urls::text LIKE '%wheelsandwins-22%' THEN 1 END) as correct_regional_urls,
  COUNT(CASE WHEN regional_urls::text LIKE '%unimogcommuni-22%' THEN 1 END) as incorrect_regional_urls
FROM affiliate_products
WHERE is_active = true;

-- Expected result:
-- total_products: 80
-- correct_affiliate_url: 80
-- correct_regional_urls: 11+
-- incorrect_regional_urls: 0
