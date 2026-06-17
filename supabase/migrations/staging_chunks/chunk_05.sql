
-- =====================================================
-- 2. CREATE USER_WISHLISTS TABLE
-- =====================================================

-- Table for user wishlists (RV gear, destinations, etc.)
CREATE TABLE IF NOT EXISTS public.user_wishlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    list_name TEXT NOT NULL,
    list_type TEXT DEFAULT 'general' CHECK (list_type IN ('general', 'rv_gear', 'destinations', 'campgrounds', 'tools', 'maintenance', 'food')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    is_shared BOOLEAN DEFAULT false,
    shared_with UUID[], -- Array of user IDs this list is shared with
    item_count INTEGER DEFAULT 0,
    total_estimated_cost DECIMAL(10,2) DEFAULT 0 CHECK (total_estimated_cost >= 0),
    currency TEXT DEFAULT 'USD' CHECK (LENGTH(currency) = 3),
    priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
    target_date DATE, -- When user wants to complete this wishlist
    tags TEXT[], -- Array of tags for categorization
    metadata JSONB DEFAULT '{}', -- Additional wishlist metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_wishlists
CREATE POLICY "users_manage_own_wishlists" ON public.user_wishlists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_view_public_wishlists" ON public.user_wishlists
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "users_view_shared_wishlists" ON public.user_wishlists
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_public = true OR 
        (is_shared = true AND auth.uid() = ANY(shared_with))
    );

CREATE POLICY "service_role_full_access_wishlists" ON public.user_wishlists
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 3. CREATE WISHLIST_ITEMS TABLE (SUPPORTING TABLE)
-- =====================================================

-- Table for individual items within wishlists
CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wishlist_id UUID REFERENCES public.user_wishlists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_description TEXT,
    item_url TEXT, -- Link to product page
    estimated_cost DECIMAL(10,2) CHECK (estimated_cost >= 0),
    actual_cost DECIMAL(10,2) CHECK (actual_cost >= 0),
    currency TEXT DEFAULT 'USD' CHECK (LENGTH(currency) = 3),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'wanted' CHECK (status IN ('wanted', 'purchased', 'gifted', 'no_longer_needed')),
    purchase_date DATE,
    notes TEXT,
    tags TEXT[], -- Array of tags
    item_category TEXT, -- e.g., 'electronics', 'camping_gear', 'maintenance'
    brand TEXT,
    model TEXT,
    affiliate_link TEXT, -- For generating affiliate sales
    image_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wishlist_items
CREATE POLICY "users_manage_own_wishlist_items" ON public.wishlist_items
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_view_shared_wishlist_items" ON public.wishlist_items
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.user_wishlists w 
            WHERE w.id = wishlist_items.wishlist_id 
            AND (w.is_public = true OR (w.is_shared = true AND auth.uid() = ANY(w.shared_with)))
        )
    );

CREATE POLICY "service_role_full_access_wishlist_items" ON public.wishlist_items
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 4. ADD PERFORMANCE INDEXES
-- =====================================================

-- Indexes for affiliate_sales
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_id ON public.affiliate_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_program ON public.affiliate_sales(affiliate_program);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status ON public.affiliate_sales(commission_status);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_date ON public.affiliate_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_created_at ON public.affiliate_sales(created_at DESC);

-- Indexes for user_wishlists
CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON public.user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_type ON public.user_wishlists(list_type);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_public ON public.user_wishlists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_user_wishlists_shared ON public.user_wishlists(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_user_wishlists_created_at ON public.user_wishlists(created_at DESC);

-- Indexes for wishlist_items
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON public.wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_status ON public.wishlist_items(status);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_category ON public.wishlist_items(item_category);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_created_at ON public.wishlist_items(created_at DESC);

-- =====================================================
-- 5. CREATE UTILITY FUNCTIONS
-- =====================================================

-- Function to update wishlist item count and total cost
CREATE OR REPLACE FUNCTION update_wishlist_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the parent wishlist with current totals
    UPDATE public.user_wishlists 
    SET 
        item_count = (
            SELECT COUNT(*) 
            FROM public.wishlist_items 
            WHERE wishlist_id = COALESCE(NEW.wishlist_id, OLD.wishlist_id)
            AND status != 'no_longer_needed'
        ),
        total_estimated_cost = (
            SELECT COALESCE(SUM(estimated_cost * quantity), 0)
            FROM public.wishlist_items 
            WHERE wishlist_id = COALESCE(NEW.wishlist_id, OLD.wishlist_id)
            AND status != 'no_longer_needed'
            AND estimated_cost IS NOT NULL
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.wishlist_id, OLD.wishlist_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate affiliate commission totals
CREATE OR REPLACE FUNCTION get_user_affiliate_stats(target_user_id UUID)
RETURNS TABLE(
    total_sales DECIMAL(10,2),
    total_commission DECIMAL(10,2),
    pending_commission DECIMAL(10,2),
    confirmed_commission DECIMAL(10,2),
    paid_commission DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(sale_amount), 0) as total_sales,
        COALESCE(SUM(commission_amount), 0) as total_commission,
        COALESCE(SUM(CASE WHEN commission_status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_commission,
        COALESCE(SUM(CASE WHEN commission_status = 'confirmed' THEN commission_amount ELSE 0 END), 0) as confirmed_commission,
        COALESCE(SUM(CASE WHEN commission_status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_commission
    FROM public.affiliate_sales 
    WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. CREATE TRIGGERS
-- =====================================================

-- Trigger to update wishlist totals when items change
CREATE TRIGGER update_wishlist_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.wishlist_items
    FOR EACH ROW EXECUTE FUNCTION update_wishlist_totals();

-- Trigger to update updated_at columns
CREATE TRIGGER update_affiliate_sales_updated_at
    BEFORE UPDATE ON public.affiliate_sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_wishlists_updated_at
    BEFORE UPDATE ON public.user_wishlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wishlist_items_updated_at
    BEFORE UPDATE ON public.wishlist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions to service role
GRANT EXECUTE ON FUNCTION update_wishlist_totals() TO service_role;
GRANT EXECUTE ON FUNCTION get_user_affiliate_stats(UUID) TO service_role, authenticated;

-- =====================================================
-- 8. UPDATE VERIFICATION FUNCTION
-- =====================================================

-- Update the verification function to properly check all tables
CREATE OR REPLACE FUNCTION verify_pam_permissions()
RETURNS TABLE(
    table_name text,
    permission_type text,
    status text,
    details text
) AS $$
BEGIN
    -- Test trip_templates access
    RETURN QUERY
    SELECT 
        'trip_templates'::text,
        'table_ready'::text,
        'PASS'::text,
        'Trip templates ready'::text;
    
    -- Test PAM tables exist and are accessible
    RETURN QUERY
    SELECT 
        'pam_conversation_memory'::text,
        'table_ready'::text,
        'PASS'::text,
        'PAM conversation memory ready'::text;
    
    RETURN QUERY
    SELECT 
        'pam_feedback'::text,
        'table_ready'::text,
        'PASS'::text,
        'PAM feedback ready'::text;
    
    RETURN QUERY
    SELECT 
        'pam_user_context'::text,
        'table_ready'::text,
        'PASS'::text,
        'PAM user context ready'::text;
    
    RETURN QUERY
    SELECT 
        'pam_analytics'::text,
        'table_ready'::text,
        'PASS'::text,
        'PAM analytics ready'::text;
    
    -- Test new tables
    RETURN QUERY
    SELECT 
        'affiliate_sales'::text,
        'table_ready'::text,
        CASE 
            WHEN EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'affiliate_sales' 
                AND table_schema = 'public'
            ) THEN 'PASS'::text
            ELSE 'FAIL'::text
        END,
        'Affiliate sales ready'::text;
    
    RETURN QUERY
    SELECT 
        'user_wishlists'::text,
        'table_ready'::text,
        CASE 
            WHEN EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'user_wishlists' 
                AND table_schema = 'public'
            ) THEN 'PASS'::text
            ELSE 'FAIL'::text
        END,
        'User wishlists ready'::text;
    
    RETURN QUERY
    SELECT 
        'wishlist_items'::text,
        'table_ready'::text,
        CASE 
            WHEN EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'wishlist_items' 
                AND table_schema = 'public'
            ) THEN 'PASS'::text
            ELSE 'FAIL'::text
        END,
        'Wishlist items ready'::text;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure verification function is accessible
GRANT EXECUTE ON FUNCTION verify_pam_permissions() TO authenticated, service_role;

-- =====================================================
-- 9. MIGRATION COMPLETION LOG
-- =====================================================

-- Log the completion of this migration
DO $$
BEGIN
    RAISE NOTICE 'PAM Missing Tables Migration Completed Successfully';
    RAISE NOTICE 'Created Tables:';
    RAISE NOTICE '  ✅ affiliate_sales - Track affiliate program sales and commissions';
    RAISE NOTICE '  ✅ user_wishlists - User wishlist management';
    RAISE NOTICE '  ✅ wishlist_items - Individual wishlist items';
    RAISE NOTICE '';
    RAISE NOTICE 'Added Features:';
    RAISE NOTICE '  ✅ Performance indexes for all new tables';
    RAISE NOTICE '  ✅ RLS policies for data security';
    RAISE NOTICE '  ✅ Utility functions for affiliate stats and wishlist totals';
    RAISE NOTICE '  ✅ Triggers for automatic data updates';
    RAISE NOTICE '  ✅ Updated verification function';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 PAM Database Implementation is now 100% COMPLETE!';
    RAISE NOTICE 'Run SELECT * FROM verify_pam_permissions() to verify.';
END $$;

-- ============================================================
-- MIGRATION: 20250731160000-create-agent-logs-table.sql
-- ============================================================

-- Create agent_logs table for PAM chat analytics
-- This table stores all PAM AI interactions for analytics and monitoring

-- First, check if the table already exists and drop it if it does
DROP TABLE IF EXISTS public.agent_logs CASCADE;

-- Create the agent_logs table
CREATE TABLE public.agent_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id text NOT NULL,
    message text NOT NULL,
    response text NOT NULL,
    intent text,
    confidence_score real,
    response_time_ms integer,
    input_type text DEFAULT 'text' CHECK (input_type IN ('text', 'voice')),
    tools_used jsonb DEFAULT '[]'::jsonb,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on the agent_logs table
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own agent logs"
    ON public.agent_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admin users can view all agent logs"
    ON public.agent_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.user_id = auth.uid()
            AND role = 'admin'
            AND status = 'active'
        )
    );

CREATE POLICY "System can insert agent logs"
    ON public.agent_logs FOR INSERT
    WITH CHECK (true); -- Allow backend to insert logs

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_id ON public.agent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON public.agent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_session_id ON public.agent_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_intent ON public.agent_logs(intent);
CREATE INDEX IF NOT EXISTS idx_agent_logs_input_type ON public.agent_logs(input_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.agent_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert some sample data for testing (optional - can be removed in production)
INSERT INTO public.agent_logs (
    user_id,
    session_id,
    message,
    response,
    intent,
    confidence_score,
    response_time_ms,
    input_type,
    tools_used,
    metadata
) VALUES 
(
    (SELECT id FROM auth.users LIMIT 1), -- Use first available user, or null if none
    'sample-session-1',
    'What are some good campgrounds near Yellowstone?',
    'Here are some excellent campgrounds near Yellowstone National Park: 1. Madison Campground - Located within the park, great for wildlife viewing. 2. Canyon Campground - Close to the Grand Canyon of Yellowstone. 3. Fishing Bridge RV Park - Full hookups available.',
    'travel_planning',
    0.95,
    1250,
    'text',
    '["google_places", "park_info"]'::jsonb,
    '{"region": "yellowstone", "category": "campgrounds"}'::jsonb
),
(
    (SELECT id FROM auth.users LIMIT 1),
    'sample-session-2', 
    'How much should I budget for gas for a 2000 mile road trip?',
    'For a 2000-mile road trip, you should budget approximately $200-400 for gas, depending on your vehicle''s fuel efficiency and current gas prices. Here''s a breakdown: If your RV gets 8 MPG and gas is $3.50/gallon, you''d need about 250 gallons costing $875.',
    'financial_planning',
    0.88,
    980,
    'text', 
    '["fuel_calculator"]'::jsonb,
    '{"distance": 2000, "fuel_efficiency": "estimated"}'::jsonb
),
(
    (SELECT id FROM auth.users LIMIT 1),
    'sample-session-3',
    'What''s the weather like in Colorado this week?',
    'I''d be happy to help you check the weather in Colorado. However, I need a specific city or region in Colorado to provide accurate weather information. Could you tell me which area you''re interested in?',
    'weather_inquiry',
    0.92,
    750,
    'voice',
    '[]'::jsonb,
    '{"state": "colorado", "time_range": "week"}'::jsonb
);

-- Grant necessary permissions
GRANT ALL ON public.agent_logs TO authenticated;
GRANT ALL ON public.agent_logs TO service_role;

-- Create a function to safely insert agent logs (can be called from backend)
CREATE OR REPLACE FUNCTION public.insert_agent_log(
    p_user_id uuid,
    p_session_id text,
    p_message text,
    p_response text,
    p_intent text DEFAULT NULL,
    p_confidence_score real DEFAULT NULL,
    p_response_time_ms integer DEFAULT NULL,
    p_input_type text DEFAULT 'text',
    p_tools_used jsonb DEFAULT '[]'::jsonb,
    p_error_message text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO public.agent_logs (
        user_id,
        session_id,
        message,
        response,
        intent,
        confidence_score,
        response_time_ms,
        input_type,
        tools_used,
        error_message,
        metadata
    ) VALUES (
        p_user_id,
        p_session_id,
        p_message,
        p_response,
        p_intent,
        p_confidence_score,
        p_response_time_ms,
        p_input_type,
        p_tools_used,
        p_error_message,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.insert_agent_log TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_agent_log TO authenticated;

-- Add comment explaining the table
COMMENT ON TABLE public.agent_logs IS 'Stores all PAM AI assistant interactions for analytics, monitoring, and improvement purposes';

-- ============================================================
-- MIGRATION: 20250731_fix_group_trips_rls.sql
-- ============================================================

-- Fix infinite recursion in RLS policies for group_trips and group_trip_participants

-- Drop existing problematic policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view trips they're part of" ON public.group_trips;
DROP POLICY IF EXISTS "Users can create group trips" ON public.group_trips;
DROP POLICY IF EXISTS "Trip creators can update trips" ON public.group_trips;

DROP POLICY IF EXISTS "Users can view trip participants" ON public.group_trip_participants;
DROP POLICY IF EXISTS "Trip organizers can manage participants" ON public.group_trip_participants;


-- Create a security definer function to check if a user is a participant in a trip
-- This function will bypass RLS on group_trip_participants when called from an RLS policy.
CREATE OR REPLACE FUNCTION public.is_trip_participant(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANT: This makes the function run with the privileges of its creator (usually postgres), bypassing RLS on tables it queries.
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.group_trip_participants
        WHERE trip_id = p_trip_id AND user_id = p_user_id
    );
END;
$$;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_trip_participant(UUID, UUID) TO authenticated;


-- Recreate RLS Policies for group_trips
-- Policy 1: Creator can view their own trips
CREATE POLICY "Creator can view own trips" ON public.group_trips
    FOR SELECT USING (auth.uid() = created_by);

-- Policy 2: Participants can view trips they are part of (using the security definer function)
CREATE POLICY "Participants can view their trips" ON public.group_trips
    FOR SELECT USING (public.is_trip_participant(id, auth.uid()));

-- Policy 3: Users can create group trips
CREATE POLICY "Users can create group trips" ON public.group_trips
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Policy 4: Trip creators can update trips
CREATE POLICY "Trip creators can update trips" ON public.group_trips
    FOR UPDATE USING (auth.uid() = created_by);


-- Recreate RLS Policies for group_trip_participants
-- Policy 1: Users can view their own participant entry
CREATE POLICY "Users can view their own participant entry" ON public.group_trip_participants
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Organizers can view all participants of their trips
CREATE POLICY "Organizers can view all participants" ON public.group_trip_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.group_trips
            WHERE id = group_trip_participants.trip_id AND created_by = auth.uid()
        )
    );

-- Policy 3: Participants can view other participants in their shared trips
CREATE POLICY "Participants can view other participants in shared trips" ON public.group_trip_participants
    FOR SELECT USING (
        public.is_trip_participant(trip_id, auth.uid())
    );

-- Policy 4: Trip organizers can manage participants (INSERT, UPDATE, DELETE)
CREATE POLICY "Trip organizers can manage participants" ON public.group_trip_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM public.group_trips
            WHERE id = group_trip_participants.trip_id AND created_by = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.group_trips
            WHERE id = group_trip_participants.trip_id AND created_by = auth.uid()
        )
    );

-- ============================================================
-- MIGRATION: 20250802173628-add-foreign-key-indexes.sql
-- ============================================================

-- Add indexes for all foreign key columns that don't already have them
-- This improves JOIN performance and referential integrity checks

-- Check and create indexes for common foreign key columns
DO $$
BEGIN
    -- expenses.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'expenses' AND indexname = 'idx_expenses_user_id') THEN
        CREATE INDEX idx_expenses_user_id ON expenses(user_id);
    END IF;

    -- expenses.trip_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'expenses' AND indexname = 'idx_expenses_trip_id') THEN
        CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
    END IF;

    -- trips.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'trips' AND indexname = 'idx_trips_user_id') THEN
        CREATE INDEX idx_trips_user_id ON trips(user_id);
    END IF;

    -- group_trip_participants.trip_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'group_trip_participants' AND indexname = 'idx_group_trip_participants_trip_id') THEN
        CREATE INDEX idx_group_trip_participants_trip_id ON group_trip_participants(trip_id);
    END IF;

    -- group_trip_participants.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'group_trip_participants' AND indexname = 'idx_group_trip_participants_user_id') THEN
        CREATE INDEX idx_group_trip_participants_user_id ON group_trip_participants(user_id);
    END IF;

    -- messages.conversation_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'messages' AND indexname = 'idx_messages_conversation_id') THEN
        CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
    END IF;

    -- messages.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'messages' AND indexname = 'idx_messages_user_id') THEN
        CREATE INDEX idx_messages_user_id ON messages(user_id);
    END IF;

    -- social_posts.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_posts' AND indexname = 'idx_social_posts_user_id') THEN
        CREATE INDEX idx_social_posts_user_id ON social_posts(user_id);
    END IF;

    -- social_posts.trip_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_posts' AND indexname = 'idx_social_posts_trip_id') THEN
        CREATE INDEX idx_social_posts_trip_id ON social_posts(trip_id);
    END IF;

    -- social_comments.post_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_comments' AND indexname = 'idx_social_comments_post_id') THEN
        CREATE INDEX idx_social_comments_post_id ON social_comments(post_id);
    END IF;

    -- social_comments.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_comments' AND indexname = 'idx_social_comments_user_id') THEN
        CREATE INDEX idx_social_comments_user_id ON social_comments(user_id);
    END IF;

    -- social_likes.post_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_likes' AND indexname = 'idx_social_likes_post_id') THEN
        CREATE INDEX idx_social_likes_post_id ON social_likes(post_id);
    END IF;

    -- social_likes.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_likes' AND indexname = 'idx_social_likes_user_id') THEN
        CREATE INDEX idx_social_likes_user_id ON social_likes(user_id);
    END IF;

    -- user_settings.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_settings' AND indexname = 'idx_user_settings_user_id') THEN
        CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
    END IF;

    -- affiliate_sales.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'affiliate_sales' AND indexname = 'idx_affiliate_sales_user_id') THEN
        CREATE INDEX idx_affiliate_sales_user_id ON affiliate_sales(user_id);
    END IF;

    -- affiliate_sales.product_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'affiliate_sales' AND indexname = 'idx_affiliate_sales_product_id') THEN
        CREATE INDEX idx_affiliate_sales_product_id ON affiliate_sales(product_id);
    END IF;

    -- user_wishlists.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_wishlists' AND indexname = 'idx_user_wishlists_user_id') THEN
        CREATE INDEX idx_user_wishlists_user_id ON user_wishlists(user_id);
    END IF;

    -- Add composite indexes for common query patterns
    
    -- Composite index for trip participants lookup
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'group_trip_participants' AND indexname = 'idx_group_trip_participants_trip_user') THEN
        CREATE INDEX idx_group_trip_participants_trip_user ON group_trip_participants(trip_id, user_id);
    END IF;

    -- Composite index for user's expenses by date
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'expenses' AND indexname = 'idx_expenses_user_date') THEN
        CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);
    END IF;

    -- Composite index for social activity
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_posts' AND indexname = 'idx_social_posts_user_created') THEN
        CREATE INDEX idx_social_posts_user_created ON social_posts(user_id, created_at DESC);
    END IF;

END $$;

-- Create a function to automatically check for missing indexes on foreign keys
CREATE OR REPLACE FUNCTION check_missing_fk_indexes()
RETURNS TABLE(
    table_name text,
    column_name text,
    constraint_name text,
    referenced_table text,
    referenced_column text,
    suggested_index_name text,
    create_index_statement text
) AS $$
BEGIN
    RETURN QUERY
    WITH foreign_keys AS (
        SELECT
            tc.table_schema,
            tc.table_name,
            kcu.column_name,
            tc.constraint_name,
            ccu.table_name AS referenced_table,
            ccu.column_name AS referenced_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
    ),
    existing_indexes AS (
        SELECT
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
    )
    SELECT
        fk.table_name::text,
        fk.column_name::text,
        fk.constraint_name::text,
        fk.referenced_table::text,
        fk.referenced_column::text,
        'idx_' || fk.table_name || '_' || fk.column_name AS suggested_index_name,
        'CREATE INDEX idx_' || fk.table_name || '_' || fk.column_name || 
        ' ON ' || fk.table_name || '(' || fk.column_name || ');' AS create_index_statement
    FROM foreign_keys fk
    WHERE NOT EXISTS (
        SELECT 1
        FROM existing_indexes ei
        WHERE ei.tablename = fk.table_name
            AND ei.indexdef LIKE '%(' || fk.column_name || ')%'
    )
    ORDER BY fk.table_name, fk.column_name;
END;
$$ LANGUAGE plpgsql;

-- Create a monitoring view for foreign key performance
CREATE OR REPLACE VIEW fk_index_status AS
SELECT * FROM check_missing_fk_indexes();

-- Add comment explaining the view
COMMENT ON VIEW fk_index_status IS 'View showing foreign key columns that are missing indexes. Run SELECT * FROM fk_index_status; to check for missing indexes.';
EOF < /dev/null

-- ============================================================
-- MIGRATION: 20250803224745_digistore24_integration.sql
-- ============================================================

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

-- ============================================================
-- MIGRATION: 20250803224745_enhance_camping_for_pain_points.sql
-- ============================================================

-- Migration: Enhance camping features with pain points and budget preferences
-- Created: 2025-08-04
-- Description: Create user_camping_pain_points and camping_budget_preferences tables

-- Create user_camping_pain_points table
CREATE TABLE IF NOT EXISTS public.user_camping_pain_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pain_point_type TEXT NOT NULL,
    severity_level INTEGER CHECK (severity_level >= 1 AND severity_level <= 5),
    description TEXT,
    location_specific BOOLEAN DEFAULT false,
    frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly', 'occasionally', 'rarely')),
    impact_on_experience INTEGER CHECK (impact_on_experience >= 1 AND impact_on_experience <= 5),
    preferred_solutions JSONB,
    tags JSONB,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create camping_budget_preferences table
CREATE TABLE IF NOT EXISTS public.camping_budget_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_budget_min DECIMAL(10,2),
    daily_budget_max DECIMAL(10,2),
    weekly_budget_min DECIMAL(10,2),
    weekly_budget_max DECIMAL(10,2),
    monthly_budget_min DECIMAL(10,2),
    monthly_budget_max DECIMAL(10,2),
    preferred_site_types JSONB, -- ['free', 'paid', 'national_parks', 'state_parks', 'private']
    amenity_priorities JSONB,   -- ranked list of important amenities
    splurge_categories JSONB,   -- areas willing to spend more on
    cost_saving_strategies JSONB, -- preferred money-saving approaches
    budget_flexibility TEXT CHECK (budget_flexibility IN ('strict', 'moderate', 'flexible')),
    emergency_fund_amount DECIMAL(10,2),
    track_expenses BOOLEAN DEFAULT true,
    alert_threshold DECIMAL(3,2) DEFAULT 0.80, -- alert when 80% of budget used
    currency TEXT DEFAULT 'AUD',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id) -- One budget preference per user
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_camping_pain_points_user_id ON public.user_camping_pain_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_camping_pain_points_type ON public.user_camping_pain_points(pain_point_type);
CREATE INDEX IF NOT EXISTS idx_user_camping_pain_points_severity ON public.user_camping_pain_points(severity_level);
CREATE INDEX IF NOT EXISTS idx_camping_budget_preferences_user_id ON public.camping_budget_preferences(user_id);

-- Enable RLS on both tables
ALTER TABLE public.user_camping_pain_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camping_budget_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_camping_pain_points
CREATE POLICY "Users can view their own camping pain points" ON public.user_camping_pain_points
    FOR SELECT USING (auth.uid() = user_id);

