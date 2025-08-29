-- Fix marketplace schema issues and create missing marketplace_listings table

-- Create marketplace_listings table (this is what's actually missing)
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    category TEXT,
    condition TEXT DEFAULT 'used' CHECK (condition IN ('new', 'used', 'refurbished')),
    location TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Use user_id instead of seller_id
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft', 'expired')),
    images JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes for marketplace_listings
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_user_id ON public.marketplace_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON public.marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created_at ON public.marketplace_listings(created_at);

-- Disable RLS for testing
ALTER TABLE public.marketplace_listings DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.marketplace_listings TO authenticated, anon;

-- Also disable RLS on existing marketplace_favorites table for consistency
ALTER TABLE public.marketplace_favorites DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.marketplace_favorites TO authenticated, anon;

-- Now add foreign key constraint to marketplace_favorites to reference marketplace_listings
-- But first check if the constraint doesn't already exist
DO $$
BEGIN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'marketplace_favorites_listing_id_fkey'
    ) THEN
        ALTER TABLE public.marketplace_favorites 
        ADD CONSTRAINT marketplace_favorites_listing_id_fkey 
        FOREIGN KEY (listing_id) REFERENCES public.marketplace_listings(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key constraint for user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'marketplace_favorites_user_id_fkey'
    ) THEN
        ALTER TABLE public.marketplace_favorites 
        ADD CONSTRAINT marketplace_favorites_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add sample marketplace listings using user_id instead of seller_id
INSERT INTO public.marketplace_listings (title, description, price, category, condition, user_id, status)
SELECT 
    'Portable Solar Panel - 100W',
    'Perfect for camping and RV trips. Barely used, comes with cables and mounting hardware. Great for keeping your devices charged off-grid!',
    299.99,
    'Electronics',
    'used',
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    'active'
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM public.marketplace_listings LIMIT 1);

INSERT INTO public.marketplace_listings (title, description, price, category, condition, user_id, status)
SELECT 
    'Camping Chair Set (4 chairs)',
    'Lightweight folding camping chairs, perfect for around the campfire. Comfortable and compact when folded.',
    89.99,
    'Camping Gear',
    'used',
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    'active'
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
AND (SELECT COUNT(*) FROM public.marketplace_listings) < 2;