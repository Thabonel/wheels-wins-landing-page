-- Fix Critical Database Issues for PAM
-- This migration fixes all the database issues causing PAM to appear offline

-- 1. Fix infinite recursion in group_trip_participants RLS policies
-- Drop and recreate policies to prevent recursion
DO $$ 
BEGIN
    -- Check if table exists first
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'group_trip_participants') THEN
        -- Drop existing policies that might cause recursion
        DROP POLICY IF EXISTS "Users can view group trip participants" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "Users can manage their group trip participation" ON public.group_trip_participants;
        
        -- Create simple, non-recursive policies
        CREATE POLICY "group_trip_participants_select" ON public.group_trip_participants
            FOR SELECT USING (true);
            
        CREATE POLICY "group_trip_participants_insert" ON public.group_trip_participants
            FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
            
        CREATE POLICY "group_trip_participants_update" ON public.group_trip_participants
            FOR UPDATE USING (auth.uid()::text = user_id::text);
            
        CREATE POLICY "group_trip_participants_delete" ON public.group_trip_participants
            FOR DELETE USING (auth.uid()::text = user_id::text);
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

-- 3. Fix calendar_events column name issue (start_date vs start_time)
DO $$ 
BEGIN
    -- Check if table exists and has wrong column name
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        -- Check if start_date column exists but start_time doesn't
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'start_date') 
           AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'start_time') THEN
            -- Rename start_date to start_time
            ALTER TABLE public.calendar_events RENAME COLUMN start_date TO start_time;
        END IF;
        
        -- Also add end_time if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'end_time') THEN
            ALTER TABLE public.calendar_events ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;
END $$;

-- 4. Create profiles table if it doesn't exist (to fix user profile queries)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    travel_style TEXT DEFAULT 'balanced',
    vehicle_type TEXT,
    bio TEXT,
    location TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create conversation_history table with proper UUID handling
CREATE TABLE IF NOT EXISTS public.conversation_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    intent TEXT,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
CREATE POLICY "Users can view their own affiliate sales" ON public.affiliate_sales
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own wishlists" ON public.user_wishlists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public wishlists" ON public.user_wishlists
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own wishlist items" ON public.wishlist_items
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_wishlists WHERE id = wishlist_id
        )
    );

CREATE POLICY "Users can manage their own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own conversation history" ON public.conversation_history
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_id ON public.affiliate_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_date ON public.affiliate_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON public.user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON public.wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_user_id ON public.conversation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_created_at ON public.conversation_history(created_at);

-- Update conversation storage to not use "default" for UUID
-- This fixes the conversation storage UUID error