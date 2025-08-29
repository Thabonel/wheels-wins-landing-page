-- Create missing database tables required by the application
-- This fixes backend services that reference missing tables

-- 1. AFFILIATE SALES TABLE
-- Used by Stripe webhooks, revenue tracking, and PAM integration
CREATE TABLE IF NOT EXISTS public.affiliate_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Stripe webhook integration fields
    session_id TEXT UNIQUE,
    customer_email TEXT,
    amount_total INTEGER,           -- Amount in cents from Stripe
    currency TEXT DEFAULT 'usd',
    affiliate_id TEXT,
    
    -- Database service expected fields  
    product_name TEXT NOT NULL,
    product_url TEXT,
    product_id TEXT,
    category TEXT,
    
    -- Commission tracking
    amount DECIMAL(10,2),           -- Purchase amount in dollars
    commission_rate DECIMAL(5,4) DEFAULT 0.05,  -- 5% default commission
    commission DECIMAL(10,2),       -- Commission earned
    commission_earned DECIMAL(10,2), -- Alternative field name used in some places
    sale_amount DECIMAL(10,2),      -- Alternative field name
    
    -- Status and workflow
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'failed')),
    affiliate_network TEXT,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USER WISHLISTS TABLE 
-- Used by shopping features and PAM recommendations
CREATE TABLE IF NOT EXISTS public.user_wishlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Wishlist metadata
    name TEXT NOT NULL DEFAULT 'My Wishlist',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    
    -- Product details (flattened structure as expected by database service)
    product_id TEXT,
    product_name TEXT,
    product_url TEXT,
    price DECIMAL(10,2),
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate products per user
    UNIQUE(user_id, product_id)
);

-- 3. MARKETPLACE LISTINGS TABLE
-- Used by social marketplace features
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic listing information
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT DEFAULT 'Other' CHECK (category IN ('Electronics', 'Furniture', 'Parts', 'Camping', 'Tools', 'Other')),
    condition TEXT DEFAULT 'Good' CHECK (condition IN ('New', 'Excellent', 'Good', 'Fair', 'Poor', 'Used', 'Refurbished')),
    location TEXT,
    
    -- User relationships (supporting both user_id and seller_id from different parts of codebase)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller TEXT,                    -- Display name fallback
    
    -- Status and workflow
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'sold', 'expired', 'approved', 'rejected')),
    posted TEXT,                    -- Date string for display (legacy format)
    
    -- Media and images
    image TEXT,                     -- Single image URL (legacy support)
    images JSONB DEFAULT '[]',      -- Modern multiple images array
    photos TEXT[],                  -- Alternative photos array format
    
    -- User interaction
    is_favorite BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_id ON public.affiliate_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status ON public.affiliate_sales(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_sale_date ON public.affiliate_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_session_id ON public.affiliate_sales(session_id) WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON public.user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_public ON public.user_wishlists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_user_wishlists_created ON public.user_wishlists(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_user_id ON public.marketplace_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON public.marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON public.marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created ON public.marketplace_listings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_sales
CREATE POLICY "Users can view their own affiliate sales" ON public.affiliate_sales
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own affiliate sales" ON public.affiliate_sales
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access to affiliate_sales" ON public.affiliate_sales
    FOR ALL TO service_role USING (true);

-- RLS Policies for user_wishlists  
CREATE POLICY "Users can manage their own wishlists" ON public.user_wishlists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public wishlists" ON public.user_wishlists
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Service role has full access to wishlists" ON public.user_wishlists
    FOR ALL TO service_role USING (true);

-- RLS Policies for marketplace_listings
CREATE POLICY "Users can manage their own listings" ON public.marketplace_listings
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = seller_id);

CREATE POLICY "Users can view active listings" ON public.marketplace_listings
    FOR SELECT USING (status IN ('active', 'approved') OR auth.uid() = user_id OR auth.uid() = seller_id);

CREATE POLICY "Service role has full access to marketplace" ON public.marketplace_listings
    FOR ALL TO service_role USING (true);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wishlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS update_affiliate_sales_updated_at ON public.affiliate_sales;
CREATE TRIGGER update_affiliate_sales_updated_at
    BEFORE UPDATE ON public.affiliate_sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_wishlists_updated_at ON public.user_wishlists;
CREATE TRIGGER update_user_wishlists_updated_at
    BEFORE UPDATE ON public.user_wishlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_listings_updated_at ON public.marketplace_listings;
CREATE TRIGGER update_marketplace_listings_updated_at
    BEFORE UPDATE ON public.marketplace_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE public.affiliate_sales IS 'Tracks affiliate sales and commissions from e-commerce integrations';
COMMENT ON TABLE public.user_wishlists IS 'User wishlist management for saving products';
COMMENT ON TABLE public.marketplace_listings IS 'Social marketplace for users to buy/sell RV items';

COMMENT ON COLUMN public.affiliate_sales.amount_total IS 'Amount in cents from Stripe webhooks';
COMMENT ON COLUMN public.affiliate_sales.amount IS 'Amount in dollars for display/calculation';
COMMENT ON COLUMN public.user_wishlists.is_public IS 'Whether other users can view this wishlist';
COMMENT ON COLUMN public.marketplace_listings.posted IS 'Legacy date string field for display compatibility';