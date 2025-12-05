-- Migrate to Unified Affiliate Shop Schema
-- Date: November 22, 2025
-- Purpose: Replace old products table with comprehensive affiliate products schema
-- Backup: Creates products_legacy_backup before dropping old table

-- PART 1: BACKUP OLD PRODUCTS TABLE
-- This preserves any existing Unimog shop items in case you need to reference them later

BEGIN;

-- Rename old products table as backup
ALTER TABLE IF EXISTS products RENAME TO products_legacy_backup;

-- Note: cart_items and order_items will now reference non-existent products table
-- This is intentional - we're starting fresh with affiliate products
-- If you need to preserve carts/orders, export them first

COMMIT;

-- PART 2: CREATE NEW AFFILIATE SHOP SCHEMA
-- Complete schema for Amazon affiliate products with analytics

BEGIN;

-- Create enum types
CREATE TYPE affiliate_provider AS ENUM ('amazon', 'ebay', 'custom');
CREATE TYPE product_category AS ENUM (
  'recovery_gear',
  'camping_expedition',
  'tools_maintenance',
  'parts_upgrades',
  'books_manuals',
  'apparel_merchandise',
  'electronics',
  'outdoor_gear'
);

-- Create affiliate_products table (main products table)
CREATE TABLE affiliate_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  short_description text,
  category product_category NOT NULL,
  price numeric,
  currency text DEFAULT 'USD',
  image_url text,
  additional_images text[],
  affiliate_provider affiliate_provider NOT NULL,
  affiliate_url text NOT NULL,
  commission_rate numeric,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  click_count integer DEFAULT 0,
  tags text[],
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,

  -- Amazon-specific fields
  asin text,
  regional_asins jsonb,
  regional_prices jsonb,
  regional_urls jsonb
);

-- Create affiliate_product_clicks table (analytics)
CREATE TABLE affiliate_product_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES affiliate_products(id) ON DELETE CASCADE,
  user_id uuid,
  clicked_at timestamp with time zone DEFAULT now(),
  user_agent text,
  ip_address inet,
  referrer text,
  metadata jsonb
);

-- Create indexes for performance
CREATE INDEX idx_affiliate_products_provider ON affiliate_products(affiliate_provider);
CREATE INDEX idx_affiliate_products_category ON affiliate_products(category);
CREATE INDEX idx_affiliate_products_is_active ON affiliate_products(is_active);
CREATE INDEX idx_affiliate_products_sort_order ON affiliate_products(sort_order);
CREATE INDEX idx_affiliate_products_created_at ON affiliate_products(created_at);

CREATE INDEX idx_affiliate_clicks_product ON affiliate_product_clicks(product_id);
CREATE INDEX idx_affiliate_clicks_clicked_at ON affiliate_product_clicks(clicked_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_affiliate_products_updated_at
  BEFORE UPDATE ON affiliate_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create increment_product_clicks function
CREATE OR REPLACE FUNCTION increment_product_clicks(product_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE affiliate_products
  SET click_count = click_count + 1
  WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security)
ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_product_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public read access to active products
CREATE POLICY "Public can view active products"
  ON affiliate_products FOR SELECT
  USING (is_active = true);

-- Public can track clicks
CREATE POLICY "Public can insert clicks"
  ON affiliate_product_clicks FOR INSERT
  WITH CHECK (true);

-- Admins have full access (adjust based on your auth setup)
-- Uncomment and modify this when you have admin role configured:
-- CREATE POLICY "Admins have full access to products"
--   ON affiliate_products FOR ALL
--   USING (auth.jwt() ->> 'role' = 'admin');

COMMIT;

-- PART 3: VERIFICATION

-- Check tables created successfully
SELECT 'Schema created successfully!' as status;

SELECT
  table_name,
  CASE
    WHEN table_name = 'products_legacy_backup' THEN 'Backup of old products'
    WHEN table_name = 'affiliate_products' THEN 'NEW main products table'
    WHEN table_name = 'affiliate_product_clicks' THEN 'Click tracking / analytics'
  END as description
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('products_legacy_backup', 'affiliate_products', 'affiliate_product_clicks')
ORDER BY table_name;

-- Show row counts
SELECT
  'products_legacy_backup' as table_name,
  COUNT(*) as row_count
FROM products_legacy_backup
UNION ALL
SELECT
  'affiliate_products' as table_name,
  COUNT(*) as row_count
FROM affiliate_products;

-- Ready for product import!
SELECT 'Ready to import Amazon products!' as next_step;
