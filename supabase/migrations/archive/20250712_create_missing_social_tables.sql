-- Create missing tables for full social functionality

-- Create post_comments table for comment functionality
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create marketplace_listings table for marketplace functionality
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    category TEXT,
    condition TEXT DEFAULT 'used' CHECK (condition IN ('new', 'used', 'refurbished')),
    location TEXT,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft', 'expired')),
    images JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create marketplace_favorites table for favorites functionality  
CREATE TABLE IF NOT EXISTS public.marketplace_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, listing_id)
);

-- Fix social_group_members table (rename from group_memberships if it exists)
DO $$
BEGIN
    -- Check if group_memberships exists and social_group_members doesn't
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_memberships') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_group_members') THEN
        ALTER TABLE public.group_memberships RENAME TO social_group_members;
    END IF;
    
    -- Create social_group_members table if neither exists
    CREATE TABLE IF NOT EXISTS public.social_group_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        UNIQUE(group_id, user_id)
    );
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON public.post_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON public.marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON public.marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created_at ON public.marketplace_listings(created_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_user_id ON public.marketplace_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_listing_id ON public.marketplace_favorites(listing_id);

CREATE INDEX IF NOT EXISTS idx_social_group_members_group_id ON public.social_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_social_group_members_user_id ON public.social_group_members(user_id);

-- Disable RLS temporarily on all new tables for testing
ALTER TABLE public.post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_group_members DISABLE ROW LEVEL SECURITY;

-- Grant permissions to all tables
GRANT ALL ON public.post_comments TO authenticated, anon;
GRANT ALL ON public.marketplace_listings TO authenticated, anon;
GRANT ALL ON public.marketplace_favorites TO authenticated, anon;
GRANT ALL ON public.social_group_members TO authenticated, anon;

-- Add some sample marketplace listings
INSERT INTO public.marketplace_listings (title, description, price, category, condition, seller_id, status)
SELECT 
    'Portable Solar Panel - 100W',
    'Perfect for camping and RV trips. Barely used, comes with cables and mounting hardware. Great for keeping your devices charged off-grid!',
    299.99,
    'Electronics',
    'used',
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    'active'
WHERE NOT EXISTS (SELECT 1 FROM public.marketplace_listings LIMIT 1);

INSERT INTO public.marketplace_listings (title, description, price, category, condition, seller_id, status)
SELECT 
    'Camping Chair Set (4 chairs)',
    'Lightweight folding camping chairs, perfect for around the campfire. Comfortable and compact when folded.',
    89.99,
    'Camping Gear',
    'used',
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    'active'
WHERE (SELECT COUNT(*) FROM public.marketplace_listings) < 2;