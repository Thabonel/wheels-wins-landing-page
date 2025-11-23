-- Fix RLS policies for affiliate_products to allow admin access
-- Run this in Supabase SQL Editor

-- First, check current policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'affiliate_products';

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Public can view active products" ON affiliate_products;
DROP POLICY IF EXISTS "Public can insert clicks" ON affiliate_product_clicks;

-- Create new policies that allow:
-- 1. Anonymous users can view active products (for public shop)
-- 2. Authenticated users can view all products (for admin)
-- 3. Authenticated users can manage all products (for admin CRUD)

CREATE POLICY "Anyone can view active products"
  ON affiliate_products FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all products"
  ON affiliate_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON affiliate_products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON affiliate_products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON affiliate_products FOR DELETE
  TO authenticated
  USING (true);

-- Fix click tracking table
CREATE POLICY "Anyone can insert clicks"
  ON affiliate_product_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('affiliate_products', 'affiliate_product_clicks')
ORDER BY tablename, policyname;
