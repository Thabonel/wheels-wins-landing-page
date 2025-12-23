ALTER TABLE affiliate_products
  ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'unknown' CHECK (
    availability_status IN ('available', 'unavailable', 'unknown', 'checking')
  ),
  ADD COLUMN IF NOT EXISTS last_availability_check TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_price_check TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS price_change_detected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS availability_change_detected BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_affiliate_products_availability
  ON affiliate_products(availability_status);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_last_check
  ON affiliate_products(last_availability_check);

CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES affiliate_products(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  asin TEXT NOT NULL,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  currency TEXT NOT NULL,
  price_change_percent DECIMAL(5,2),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'manual',
  CONSTRAINT unique_product_region_check
    UNIQUE (product_id, region, checked_at)
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_region
  ON product_price_history(product_id, region, checked_at DESC);

CREATE TABLE IF NOT EXISTS product_availability_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES affiliate_products(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  asin TEXT NOT NULL,
  was_available BOOLEAN,
  is_available BOOLEAN NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'manual',
  error_message TEXT,
  CONSTRAINT unique_product_region_availability_check
    UNIQUE (product_id, region, checked_at)
);

CREATE INDEX IF NOT EXISTS idx_availability_log_product_region
  ON product_availability_log(product_id, region, checked_at DESC);

UPDATE affiliate_products
SET availability_status = 'available'
WHERE is_active = true AND availability_status IS NULL;

UPDATE affiliate_products
SET availability_status = 'unknown'
WHERE is_active = false AND availability_status IS NULL;
