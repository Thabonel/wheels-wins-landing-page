DELETE FROM public.affiliate_products
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY asin ORDER BY created_at ASC, id ASC) as rn
    FROM public.affiliate_products
  ) duplicates
  WHERE rn > 1
);

SELECT COUNT(*) as remaining_products FROM public.affiliate_products;
SELECT COUNT(DISTINCT asin) as unique_asins FROM public.affiliate_products;
