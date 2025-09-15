-- Critical Database Fixes for Production Issues
-- Run these fixes to resolve RLS policy recursion and missing tables

-- =========================================
-- 1. Fix Infinite Recursion in RLS Policies
-- =========================================

-- Drop problematic recursive policy
DROP POLICY IF EXISTS "group_trip_participants_policy" ON group_trip_participants;

-- Create non-recursive RLS policy for group_trip_participants
CREATE POLICY "group_trip_participants_read_policy" 
ON group_trip_participants FOR SELECT 
USING (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.role = 'admin'
    )
);

CREATE POLICY "group_trip_participants_insert_policy" 
ON group_trip_participants FOR INSERT 
WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.role = 'admin'
    )
);

CREATE POLICY "group_trip_participants_update_policy" 
ON group_trip_participants FOR UPDATE 
USING (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.role = 'admin'
    )
);

CREATE POLICY "group_trip_participants_delete_policy" 
ON group_trip_participants FOR DELETE 
USING (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.role = 'admin'
    )
);

-- =========================================
-- 2. Create Missing Tables
-- =========================================

-- Create affiliate_sales table
CREATE TABLE IF NOT EXISTS affiliate_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    affiliate_id UUID REFERENCES user_profiles(id),
    product_name TEXT NOT NULL,
    product_category TEXT,
    sale_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    commission_amount DECIMAL(10,2) GENERATED ALWAYS AS (sale_amount * commission_rate) STORED,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
    tracking_code TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on affiliate_sales
ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for affiliate_sales
CREATE POLICY "affiliate_sales_read_policy" 
ON affiliate_sales FOR SELECT 
USING (
    user_id = auth.uid() OR 
    affiliate_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.role = 'admin'
    )
);

CREATE POLICY "affiliate_sales_insert_policy" 
ON affiliate_sales FOR INSERT 
WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.role IN ('admin', 'affiliate')
    )
);

CREATE POLICY "affiliate_sales_update_policy" 
ON affiliate_sales FOR UPDATE 
USING (
    user_id = auth.uid() OR 
    affiliate_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.role = 'admin'
    )
);

-- Create user_wishlists table
CREATE TABLE IF NOT EXISTS user_wishlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    wishlist_name TEXT NOT NULL DEFAULT 'My Wishlist',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    category TEXT DEFAULT 'general',
    priority INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_wishlists
ALTER TABLE user_wishlists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_wishlists
CREATE POLICY "user_wishlists_read_policy" 
ON user_wishlists FOR SELECT 
USING (
    user_id = auth.uid() OR 
    is_public = TRUE OR
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.role = 'admin'
    )
);

CREATE POLICY "user_wishlists_insert_policy" 
ON user_wishlists FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_wishlists_update_policy" 
ON user_wishlists FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "user_wishlists_delete_policy" 
ON user_wishlists FOR DELETE 
USING (user_id = auth.uid());

-- Create wishlist_items table to store individual items
CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wishlist_id UUID REFERENCES user_wishlists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_description TEXT,
    item_url TEXT,
    item_price DECIMAL(10,2),
    item_priority INTEGER DEFAULT 1,
    is_purchased BOOLEAN DEFAULT FALSE,
    purchased_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on wishlist_items
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wishlist_items
CREATE POLICY "wishlist_items_read_policy" 
ON wishlist_items FOR SELECT 
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM user_wishlists w 
        WHERE w.id = wishlist_id 
        AND (w.user_id = auth.uid() OR w.is_public = TRUE)
    ) OR
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.role = 'admin'
    )
);

CREATE POLICY "wishlist_items_insert_policy" 
ON wishlist_items FOR INSERT 
WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM user_wishlists w 
        WHERE w.id = wishlist_id 
        AND w.user_id = auth.uid()
    )
);

CREATE POLICY "wishlist_items_update_policy" 
ON wishlist_items FOR UPDATE 
USING (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM user_wishlists w 
        WHERE w.id = wishlist_id 
        AND w.user_id = auth.uid()
    )
);

CREATE POLICY "wishlist_items_delete_policy" 
ON wishlist_items FOR DELETE 
USING (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM user_wishlists w 
        WHERE w.id = wishlist_id 
        AND w.user_id = auth.uid()
    )
);

-- =========================================
-- 3. Create Indexes for Performance
-- =========================================

-- Indexes for affiliate_sales
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_id ON affiliate_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_affiliate_id ON affiliate_sales(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_date ON affiliate_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status ON affiliate_sales(status);

-- Indexes for user_wishlists
CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_public ON user_wishlists(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_wishlists_default ON user_wishlists(user_id, is_default) WHERE is_default = TRUE;

-- Indexes for wishlist_items
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_purchased ON wishlist_items(is_purchased);

-- =========================================
-- 4. Create Updated Timestamp Triggers
-- =========================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_affiliate_sales_updated_at 
    BEFORE UPDATE ON affiliate_sales 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_wishlists_updated_at 
    BEFORE UPDATE ON user_wishlists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wishlist_items_updated_at 
    BEFORE UPDATE ON wishlist_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- 5. Add Default Wishlist for Existing Users
-- =========================================

-- Insert default wishlists for users who don't have any
INSERT INTO user_wishlists (user_id, wishlist_name, is_default, description)
SELECT 
    up.id,
    'My Travel Wishlist',
    TRUE,
    'Default wishlist for travel items and RV gear'
FROM user_profiles up
WHERE NOT EXISTS (
    SELECT 1 FROM user_wishlists w 
    WHERE w.user_id = up.id
)
ON CONFLICT DO NOTHING;

-- =========================================
-- 6. Fix Any Remaining RLS Policy Issues
-- =========================================

-- Check and fix other potentially problematic policies
-- This query will help identify recursive policies
/*
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
    qual LIKE '%group_trip_participants%' OR 
    with_check LIKE '%group_trip_participants%'
);
*/

-- Add proper permissions for service role
GRANT SELECT, INSERT, UPDATE, DELETE ON affiliate_sales TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_wishlists TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON wishlist_items TO service_role;

-- Add usage permissions on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =========================================
-- 7. Performance Optimizations
-- =========================================

-- Analyze tables for query optimization
ANALYZE affiliate_sales;
ANALYZE user_wishlists;
ANALYZE wishlist_items;

-- Vacuum tables to reclaim space
VACUUM ANALYZE affiliate_sales;
VACUUM ANALYZE user_wishlists;
VACUUM ANALYZE wishlist_items;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Critical database fixes completed successfully!';
    RAISE NOTICE 'Fixed: RLS policy recursion, created missing tables, added indexes';
    RAISE NOTICE 'Tables created: affiliate_sales, user_wishlists, wishlist_items';
END $$;