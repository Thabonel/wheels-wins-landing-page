-- Remove duplicate products, keep the first one of each ASIN
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY asin ORDER BY created_at ASC, id ASC) as row_num
  FROM public.affiliate_products
)
DELETE FROM public.affiliate_products
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Verify results
SELECT
  COUNT(*) as total_products,
  COUNT(DISTINCT asin) as unique_products,
  COUNT(*) FILTER (WHERE is_active = true) as active_products,
  COUNT(*) FILTER (WHERE affiliate_provider = 'amazon') as amazon_products
FROM public.affiliate_products;
