-- Missing PAM Tools Database Tables
-- Created: October 9, 2025
-- Purpose: Add tables required by PAM tools that were missing from schema

-- ============================================
-- SHOP TABLES (4 tables)
-- ============================================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_active ON public.products(is_active);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_cart_items_user ON public.cart_items(user_id);
CREATE INDEX idx_cart_items_product ON public.cart_items(product_id);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    shipping_address JSONB NOT NULL,
    payment_method TEXT,
    tracking_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase DECIMAL(10,2) NOT NULL CHECK (price_at_purchase >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

-- ============================================
-- TRIP TABLES (2 tables)
-- ============================================

CREATE TABLE IF NOT EXISTS public.campgrounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    price_per_night DECIMAL(10,2) CHECK (price_per_night >= 0),
    amenities TEXT[] DEFAULT '{}',
    description TEXT,
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    phone TEXT,
    website TEXT,
    is_rv_friendly BOOLEAN DEFAULT true,
    max_rv_length INTEGER,
    hookup_types TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campgrounds_location ON public.campgrounds USING GIST(location);
CREATE INDEX idx_campgrounds_price ON public.campgrounds(price_per_night);
CREATE INDEX idx_campgrounds_rating ON public.campgrounds(rating);

CREATE TABLE IF NOT EXISTS public.favorite_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_name TEXT NOT NULL,
    location_address TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_favorite_locations_user ON public.favorite_locations(user_id);
CREATE INDEX idx_favorite_locations_category ON public.favorite_locations(category);

-- ============================================
-- SOCIAL TABLES (3 tables)
-- ============================================

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON public.comments(post_id);
CREATE INDEX idx_comments_user ON public.comments(user_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_comment_id);

CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX idx_post_likes_user ON public.post_likes(user_id);

CREATE TABLE IF NOT EXISTS public.shared_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    location_name TEXT,
    description TEXT,
    share_duration_hours INTEGER DEFAULT 24,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_shared_locations_user ON public.shared_locations(user_id);
CREATE INDEX idx_shared_locations_location ON public.shared_locations USING GIST(location);
CREATE INDEX idx_shared_locations_active ON public.shared_locations(is_active);

-- ============================================
-- PROFILE TABLES (1 table)
-- ============================================

CREATE TABLE IF NOT EXISTS public.privacy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
    location_sharing BOOLEAN DEFAULT false,
    trip_sharing BOOLEAN DEFAULT true,
    expense_sharing BOOLEAN DEFAULT false,
    show_in_search BOOLEAN DEFAULT true,
    allow_messages BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_privacy_settings_user ON public.privacy_settings(user_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select ON public.products FOR SELECT USING (is_active = true);

CREATE POLICY cart_items_all ON public.cart_items FOR ALL USING (auth.uid() = user_id);

CREATE POLICY orders_all ON public.orders FOR ALL USING (auth.uid() = user_id);

CREATE POLICY order_items_select ON public.order_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
);

CREATE POLICY campgrounds_select ON public.campgrounds FOR SELECT USING (true);

CREATE POLICY favorite_locations_all ON public.favorite_locations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY comments_select ON public.comments FOR SELECT USING (true);
CREATE POLICY comments_insert ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY comments_update ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY comments_delete ON public.comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY post_likes_select ON public.post_likes FOR SELECT USING (true);
CREATE POLICY post_likes_insert ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY post_likes_delete ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY shared_locations_select ON public.shared_locations FOR SELECT USING (
    is_active = true AND (expires_at IS NULL OR expires_at > NOW())
);
CREATE POLICY shared_locations_all ON public.shared_locations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY privacy_settings_all ON public.privacy_settings FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campgrounds_updated_at BEFORE UPDATE ON public.campgrounds
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_favorite_locations_updated_at BEFORE UPDATE ON public.favorite_locations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at BEFORE UPDATE ON public.privacy_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
