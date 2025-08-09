-- Enhance missing tables to match backend database service expectations
-- This migration ensures all tables referenced by the backend services exist with correct structure

-- 1. Enhance affiliate_sales table with all fields expected by database service
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'product_name') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN product_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'product_url') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN product_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'amount') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN amount DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'commission') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN commission DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'category') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN category TEXT;
    END IF;
END $$;

-- 2. Enhance user_wishlists table to match database service expectations
-- The database service expects a flattened structure with product details directly in the table
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'product_id') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN product_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'product_name') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN product_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'price') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN price DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'category') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN category TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'notes') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN notes TEXT;
    END IF;
END $$;

-- 3. Ensure marketplace_listings table exists with all expected fields
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic listing information
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT DEFAULT 'Other',
    condition TEXT DEFAULT 'Good',
    location TEXT,
    
    -- User relationships (supporting both user_id and seller_id)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller TEXT,
    
    -- Status and workflow
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'sold', 'expired', 'approved', 'rejected')),
    
    -- Media
    image TEXT,
    images JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for marketplace_listings if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'marketplace_listings' 
        AND policyname = 'Users can view active listings'
    ) THEN
        ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view active listings" ON public.marketplace_listings
            FOR SELECT USING (status = 'active' OR auth.uid() = user_id OR auth.uid() = seller_id);
        
        CREATE POLICY "Users can manage their own listings" ON public.marketplace_listings
            FOR ALL USING (auth.uid() = user_id OR auth.uid() = seller_id);
    END IF;
END $$;

-- 4. Update affiliate_sales policies to match database service usage
DROP POLICY IF EXISTS "Service role has full access to affiliate_sales" ON public.affiliate_sales;
CREATE POLICY "Service role has full access to affiliate_sales" ON public.affiliate_sales
    FOR ALL TO service_role USING (true);

-- Allow inserts for webhook processing
CREATE POLICY IF NOT EXISTS "Users can insert affiliate sales" ON public.affiliate_sales
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Update user_wishlists policies
DROP POLICY IF EXISTS "Service role has full access to wishlists" ON public.user_wishlists;
CREATE POLICY "Service role has full access to wishlists" ON public.user_wishlists
    FOR ALL TO service_role USING (true);

-- 6. Add performance indexes for database service queries
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_product_name ON public.affiliate_sales(product_name);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_category ON public.affiliate_sales(category);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_amount ON public.affiliate_sales(amount);

CREATE INDEX IF NOT EXISTS idx_user_wishlists_product_name ON public.user_wishlists(product_name);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_category ON public.user_wishlists(category);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_price ON public.user_wishlists(price);

CREATE INDEX IF NOT EXISTS idx_marketplace_seller_id ON public.marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON public.marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON public.marketplace_listings(status);

-- 7. Grant proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wishlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;

-- 8. Add table comments for documentation
COMMENT ON TABLE public.affiliate_sales IS 'Affiliate sales tracking - enhanced for database service compatibility';
COMMENT ON TABLE public.user_wishlists IS 'User wishlists with flattened product structure for database service';
COMMENT ON TABLE public.marketplace_listings IS 'Social marketplace listings for RV community';

-- 9. Ensure update triggers exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_marketplace_listings_updated_at'
    ) THEN
        CREATE TRIGGER update_marketplace_listings_updated_at
            BEFORE UPDATE ON public.marketplace_listings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;