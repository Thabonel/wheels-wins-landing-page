-- Digistore24 Integration Database Schema
-- This migration adds fields needed for Digistore24 product sync and affiliate tracking

-- Add Digistore24 fields to shop_products table
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS
  digistore24_product_id TEXT UNIQUE,
  digistore24_vendor_id TEXT,
  commission_percentage DECIMAL(5,2),
  commission_type TEXT CHECK (commission_type IN ('fixed', 'percentage', 'revshare')),
  affiliate_link TEXT,
  auto_approved BOOLEAN DEFAULT false,
  vendor_rating DECIMAL(3,2),
  marketplace_category TEXT,
  target_audience TEXT[],
  last_synced TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'active', 'inactive', 'error'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_digistore24_product_id ON shop_products(digistore24_product_id) WHERE digistore24_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commission_percentage ON shop_products(commission_percentage) WHERE commission_percentage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auto_approved ON shop_products(auto_approved) WHERE auto_approved = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON shop_products(marketplace_category) WHERE marketplace_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sync_status ON shop_products(sync_status);

-- Update affiliate_sales table for Digistore24 tracking
ALTER TABLE affiliate_sales ADD COLUMN IF NOT EXISTS
  digistore24_order_id TEXT UNIQUE,
  digistore24_product_id TEXT,
  digistore24_customer_id TEXT,
  payment_method TEXT,
  billing_type TEXT CHECK (billing_type IN ('single_payment', 'installment', 'subscription')),
  pay_sequence_no INTEGER,
  installment_count INTEGER,
  is_test_mode BOOLEAN DEFAULT false,
  ipn_received_at TIMESTAMP WITH TIME ZONE,
  thank_you_validated BOOLEAN DEFAULT false;

-- Add indexes for affiliate_sales
CREATE INDEX IF NOT EXISTS idx_digistore24_order_id ON affiliate_sales(digistore24_order_id) WHERE digistore24_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_digistore24_customer_id ON affiliate_sales(digistore24_customer_id) WHERE digistore24_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_type ON affiliate_sales(billing_type) WHERE billing_type IS NOT NULL;

-- Create table for Digistore24 sync logs
CREATE TABLE IF NOT EXISTS digistore24_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('products', 'orders', 'affiliates')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  products_synced INTEGER DEFAULT 0,
  products_added INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_removed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for Digistore24 webhook logs
CREATE TABLE IF NOT EXISTS digistore24_webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  order_id TEXT,
  product_id TEXT,
  raw_payload JSONB NOT NULL,
  signature_valid BOOLEAN DEFAULT false,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for webhook logs
CREATE INDEX IF NOT EXISTS idx_webhook_event_type ON digistore24_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_order_id ON digistore24_webhook_logs(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_processed ON digistore24_webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_created ON digistore24_webhook_logs(created_at DESC);

-- Enable RLS for new tables
ALTER TABLE digistore24_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE digistore24_webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for sync logs (admin only)
CREATE POLICY "Admin users can view sync logs" ON digistore24_sync_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_settings 
    WHERE user_id = auth.uid() 
    AND preferences->>'role' = 'admin'
  ));

CREATE POLICY "Service role has full access to sync logs" ON digistore24_sync_logs
  FOR ALL TO service_role USING (true);

-- RLS policies for webhook logs (admin only)
CREATE POLICY "Admin users can view webhook logs" ON digistore24_webhook_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_settings 
    WHERE user_id = auth.uid() 
    AND preferences->>'role' = 'admin'
  ));

CREATE POLICY "Service role has full access to webhook logs" ON digistore24_webhook_logs
  FOR ALL TO service_role USING (true);

-- Grant permissions
GRANT SELECT ON digistore24_sync_logs TO authenticated;
GRANT SELECT ON digistore24_webhook_logs TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE digistore24_sync_logs IS 'Tracks Digistore24 product sync operations';
COMMENT ON TABLE digistore24_webhook_logs IS 'Stores raw webhook data from Digistore24 for debugging';
COMMENT ON COLUMN shop_products.digistore24_product_id IS 'Unique product ID from Digistore24 marketplace';
COMMENT ON COLUMN shop_products.commission_percentage IS 'Commission rate for affiliates (e.g., 50.00 for 50%)';
COMMENT ON COLUMN shop_products.auto_approved IS 'Whether affiliates are automatically approved';
COMMENT ON COLUMN shop_products.vendor_rating IS 'Vendor rating from 0-5 stars';
COMMENT ON COLUMN shop_products.target_audience IS 'Array of target audience tags (e.g., women, solo-travelers)';
COMMENT ON COLUMN affiliate_sales.digistore24_order_id IS 'Unique order ID from Digistore24';
COMMENT ON COLUMN affiliate_sales.billing_type IS 'Payment structure: single, installment, or subscription';
COMMENT ON COLUMN affiliate_sales.thank_you_validated IS 'Whether the thank you page parameters were validated';