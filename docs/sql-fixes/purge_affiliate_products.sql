-- Purge all affiliate products (with backup) and cascade delete clicks
-- Use in Supabase SQL Editor (runs as service role, bypasses RLS)
-- Safe steps:
-- 1) Create a timestamped backup
-- 2) Show counts
-- 3) TRUNCATE CASCADE (or DELETE fallback)
-- 4) Verify

BEGIN;

-- 1) Backup current data
DO $$
DECLARE
  ts text := to_char(now(), 'YYYYMMDD_HH24MISS');
  backup_table text := 'affiliate_products_backup_' || ts;
BEGIN
  EXECUTE format('CREATE TABLE %I AS TABLE public.affiliate_products', backup_table);
  RAISE NOTICE 'Backup table created: %', backup_table;
END $$;

-- 2) Show current counts
SELECT 'Before purge' AS phase, 
       COUNT(*) AS products
FROM public.affiliate_products;

SELECT 'Before purge' AS phase,
       COUNT(*) AS clicks
FROM public.affiliate_product_clicks;

-- 3) Purge products and cascade delete clicks
-- Preferred: TRUNCATE with CASCADE (fast)
TRUNCATE TABLE public.affiliate_products CASCADE;

-- 4) Verify counts after
SELECT 'After purge' AS phase, 
       COUNT(*) AS products
FROM public.affiliate_products;

SELECT 'After purge' AS phase,
       COUNT(*) AS clicks
FROM public.affiliate_product_clicks;

COMMIT;

-- If TRUNCATE is not permitted in your environment, you can fallback to:
-- BEGIN;
-- DELETE FROM public.affiliate_products; -- ON DELETE CASCADE handles clicks
-- COMMIT;

