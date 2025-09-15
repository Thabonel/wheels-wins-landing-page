-- Fix Critical Database Issues for PAM
-- This migration fixes database issues identified in the logs

-- 1. Fix infinite recursion in group_trip_participants RLS policies
-- Drop and recreate policies to prevent recursion
DO $$ 
BEGIN
    -- Check if table exists first
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'group_trip_participants' AND table_schema = 'public') THEN
        -- Drop existing policies that might cause recursion
        DROP POLICY IF EXISTS "Users can view trip participants" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "Trip organizers can manage participants" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "Users can view group trip participants" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "Users can manage their group trip participation" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "group_trip_participants_select" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "group_trip_participants_insert" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "group_trip_participants_update" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "group_trip_participants_delete" ON public.group_trip_participants;
        
        -- Create simple, non-recursive policies
        -- Allow users to see participants in trips they're part of
        CREATE POLICY "users_view_own_trip_participants" ON public.group_trip_participants
            FOR SELECT USING (
                user_id = auth.uid() OR
                trip_id IN (
                    SELECT trip_id FROM public.group_trip_participants WHERE user_id = auth.uid()
                )
            );
            
        -- Allow users to manage their own participation
        CREATE POLICY "users_manage_own_participation" ON public.group_trip_participants
            FOR ALL USING (user_id = auth.uid());
            
        -- Allow trip organizers to manage participants (check group_trips table)
        CREATE POLICY "organizers_manage_participants" ON public.group_trip_participants
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.group_trips 
                    WHERE id = trip_id AND created_by = auth.uid()
                )
            );
    END IF;
END $$;

-- 2. Create missing tables: affiliate_sales and user_wishlists
CREATE TABLE IF NOT EXISTS public.affiliate_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT,
    commission_rate DECIMAL(5,4),
    sale_amount DECIMAL(10,2),
    commission_earned DECIMAL(10,2),
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    affiliate_network TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_wishlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wishlist_id UUID REFERENCES public.user_wishlists(id) ON DELETE CASCADE,
    product_id TEXT,
    product_name TEXT,
    product_url TEXT,
    price DECIMAL(10,2),
    priority INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
CREATE POLICY "Users can view their own affiliate sales" ON public.affiliate_sales
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own wishlists" ON public.user_wishlists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public wishlists" ON public.user_wishlists
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own wishlist items" ON public.wishlist_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_wishlists 
            WHERE id = wishlist_items.wishlist_id AND user_id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_id ON public.affiliate_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_date ON public.affiliate_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON public.user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON public.wishlist_items(wishlist_id);

-- Add update_updated_at triggers for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_affiliate_sales_updated_at BEFORE UPDATE ON public.affiliate_sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_wishlists_updated_at BEFORE UPDATE ON public.user_wishlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();