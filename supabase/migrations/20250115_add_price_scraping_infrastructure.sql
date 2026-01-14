-- Migration: Add price scraping infrastructure
-- Created: 2025-01-15
-- Purpose: Support automated Amazon price scraping with error tracking and history

-- Add error tracking columns to affiliate_products
ALTER TABLE public.affiliate_products
ADD COLUMN IF NOT EXISTS api_last_error text,
ADD COLUMN IF NOT EXISTS api_error_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_scraped_price numeric,
ADD COLUMN IF NOT EXISTS scrape_batch_number integer DEFAULT 0;

-- Add index for efficient batch scraping queries
CREATE INDEX IF NOT EXISTS idx_affiliate_products_scrape_batch
ON public.affiliate_products(scrape_batch_number, is_active)
WHERE is_active = true;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create cron job to scrape Amazon prices daily at 6 AM UTC
-- Note: CRON_SECRET must be set in Edge Function secrets to: wheels-wins-cron-2024-secure
SELECT cron.schedule(
  'scrape-amazon-prices-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/scrape-amazon-prices',
    headers := '{"Content-Type": "application/json", "X-Cron-Secret": "wheels-wins-cron-2024-secure"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Documentation comments
COMMENT ON COLUMN public.affiliate_products.api_last_error IS 'Last error message from price scraping';
COMMENT ON COLUMN public.affiliate_products.api_error_count IS 'Number of consecutive scraping failures (max 5 before skip)';
COMMENT ON COLUMN public.affiliate_products.last_scraped_price IS 'Last price successfully scraped from Amazon';
COMMENT ON COLUMN public.affiliate_products.scrape_batch_number IS 'Batch assignment for distributed scraping (0-9)';
