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

CREATE POLICY "Users can insert their own camping pain points" ON public.user_camping_pain_points
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own camping pain points" ON public.user_camping_pain_points
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own camping pain points" ON public.user_camping_pain_points
    FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for camping_budget_preferences
CREATE POLICY "Users can view their own camping budget preferences" ON public.camping_budget_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own camping budget preferences" ON public.camping_budget_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own camping budget preferences" ON public.camping_budget_preferences
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own camping budget preferences" ON public.camping_budget_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to automatically update the updated_at column
CREATE TRIGGER update_user_camping_pain_points_updated_at
    BEFORE UPDATE ON public.user_camping_pain_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_camping_budget_preferences_updated_at
    BEFORE UPDATE ON public.camping_budget_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.user_camping_pain_points TO authenticated;
GRANT ALL ON public.camping_budget_preferences TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.user_camping_pain_points IS 'Stores user-specific camping pain points and issues they encounter';
COMMENT ON TABLE public.camping_budget_preferences IS 'Stores user camping budget preferences and financial constraints';

COMMENT ON COLUMN public.user_camping_pain_points.pain_point_type IS 'Type of pain point (e.g., booking, facilities, cost, accessibility)';
COMMENT ON COLUMN public.user_camping_pain_points.severity_level IS 'How severe the pain point is on a scale of 1-5';
COMMENT ON COLUMN public.user_camping_pain_points.frequency IS 'How often this pain point occurs';
COMMENT ON COLUMN public.user_camping_pain_points.impact_on_experience IS 'How much this impacts overall camping experience (1-5)';

COMMENT ON COLUMN public.camping_budget_preferences.preferred_site_types IS 'JSON array of preferred camping site types';
COMMENT ON COLUMN public.camping_budget_preferences.amenity_priorities IS 'JSON array of amenities ranked by importance';
COMMENT ON COLUMN public.camping_budget_preferences.splurge_categories IS 'JSON array of categories willing to spend extra on';
COMMENT ON COLUMN public.camping_budget_preferences.cost_saving_strategies IS 'JSON array of preferred money-saving approaches';

-- ============================================================
-- MIGRATION: 20250804_fix_rls_policies.sql
-- ============================================================

-- Fix RLS policies for user tables to prevent 403 errors
-- This migration addresses the permissions issues causing the redirect bug

-- 1. Fix user_profiles_extended permissions
ALTER TABLE public.user_profiles_extended ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own profile" ON public.user_profiles_extended;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles_extended;

-- Create new policies
CREATE POLICY "Users can read their own profile"
ON public.user_profiles_extended
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles_extended
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 2. Fix user_subscriptions permissions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own subscription" ON public.user_subscriptions;

-- Create new policies
CREATE POLICY "Users can read their own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscription"
ON public.user_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- 3. Fix user_settings permissions
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;

-- Create new policies
CREATE POLICY "Users can read their own settings"
ON public.user_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Fix user_login_history permissions
ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own login history" ON public.user_login_history;
DROP POLICY IF EXISTS "Users can read their own login history" ON public.user_login_history;

-- Create new policies
CREATE POLICY "Users can insert their own login history"
ON public.user_login_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own login history"
ON public.user_login_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Fix user_active_sessions permissions
ALTER TABLE public.user_active_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_active_sessions;

-- Create new policies
CREATE POLICY "Users can manage their own sessions"
ON public.user_active_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- 6. Ensure users table has proper RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own user record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own user record" ON public.users;

-- Create new policies
CREATE POLICY "Users can read their own user record"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own user record"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_profiles_extended TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT ON public.user_login_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_active_sessions TO authenticated;
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_extended_user_id ON public.user_profiles_extended(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_history_user_id ON public.user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_user_id ON public.user_active_sessions(user_id);

-- ============================================================
-- MIGRATION: 20250804_fix_trip_templates_rls.sql
-- ============================================================

-- Fix trip_templates RLS to allow anonymous users to view public templates
-- This fixes the issue where only 2 fallback templates show instead of all database templates

-- Enable RLS if not already enabled
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "authenticated_users_view_public_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "users_manage_own_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "users_create_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "service_role_full_access_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "Users can manage own templates" ON public.trip_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON public.trip_templates;

-- Create new comprehensive policies

-- 1. CRITICAL: Allow EVERYONE (including anonymous) to view public templates
CREATE POLICY "anyone_can_view_public_templates" 
ON public.trip_templates
FOR SELECT
TO public  -- This allows both authenticated and anonymous users
USING (is_public = true);

-- 2. Authenticated users can view their own private templates
CREATE POLICY "users_view_own_templates" 
ON public.trip_templates
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_public = true);

-- 3. Users can create templates
CREATE POLICY "users_create_templates" 
ON public.trip_templates
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. Users can update their own templates
CREATE POLICY "users_update_own_templates" 
ON public.trip_templates
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 5. Users can delete their own templates
CREATE POLICY "users_delete_own_templates" 
ON public.trip_templates
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 6. Service role has full access
CREATE POLICY "service_role_full_access" 
ON public.trip_templates
FOR ALL
TO service_role
USING (true);

-- Grant necessary permissions
GRANT SELECT ON public.trip_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.trip_templates TO authenticated;

-- Verify the templates exist and are public
DO $$
DECLARE
    template_count INTEGER;
    public_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count FROM public.trip_templates;
    SELECT COUNT(*) INTO public_count FROM public.trip_templates WHERE is_public = true;
    
    RAISE NOTICE 'Total templates in database: %', template_count;
    RAISE NOTICE 'Public templates available: %', public_count;
    
    -- If no templates exist, log a warning
    IF template_count = 0 THEN
        RAISE WARNING 'No trip templates found in database! You may need to run the seed data script.';
    ELSIF public_count = 0 THEN
        RAISE WARNING 'Templates exist but none are marked as public! Update is_public = true for templates to be visible.';
    END IF;
END $$;

-- Create a function to check template visibility for debugging
CREATE OR REPLACE FUNCTION check_template_visibility(check_user_id UUID DEFAULT NULL)
RETURNS TABLE(
    visibility_type TEXT,
    template_count BIGINT,
    example_names TEXT[]
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH visibility_check AS (
        SELECT 
            CASE 
                WHEN is_public = true THEN 'Public Templates'
                WHEN user_id = check_user_id THEN 'Your Private Templates'
                ELSE 'Not Visible'
            END as visibility_type,
            name
        FROM public.trip_templates
    )
    SELECT 
        visibility_type,
        COUNT(*) as template_count,
        ARRAY_AGG(name ORDER BY name LIMIT 5) as example_names
    FROM visibility_check
    WHERE visibility_type != 'Not Visible'
    GROUP BY visibility_type
    ORDER BY visibility_type;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_template_visibility(UUID) TO anon, authenticated;

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_templates_public_region ON public.trip_templates(is_public, tags) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_trip_templates_gin_tags ON public.trip_templates USING gin(tags);

-- Log current state
DO $$
DECLARE
    aus_templates INTEGER;
BEGIN
    -- Check for Australian templates specifically
    SELECT COUNT(*) INTO aus_templates 
    FROM public.trip_templates 
    WHERE is_public = true 
    AND tags @> ARRAY['australia'];
    
    RAISE NOTICE 'Australian public templates found: %', aus_templates;
    
    -- Show first 3 Australian templates
    RAISE NOTICE 'Sample Australian templates:';
    FOR r IN 
        SELECT name, category, tags 
        FROM public.trip_templates 
        WHERE is_public = true 
        AND tags @> ARRAY['australia']
        LIMIT 3
    LOOP
        RAISE NOTICE '  - %: % (tags: %)', r.name, r.category, r.tags;
    END LOOP;
END $$;

-- ============================================================
-- MIGRATION: 20250805140000-comprehensive-database-fixes.sql
-- ============================================================

-- Comprehensive Database Fixes for PAM Backend Issues
-- Addresses: infinite recursion, missing tables, UUID errors, RLS violations
-- Date: 2025-08-05

-- ==============================================
-- 1. Fix infinite recursion in group_trips RLS
-- ==============================================

-- Drop problematic policies that reference each other
DROP POLICY IF EXISTS "Users can view trips they're part of" ON public.group_trips;
DROP POLICY IF EXISTS "Users can create group trips" ON public.group_trips;
DROP POLICY IF EXISTS "Trip creators can update trips" ON public.group_trips;
DROP POLICY IF EXISTS "Creator can view own trips" ON public.group_trips;
DROP POLICY IF EXISTS "Participants can view their trips" ON public.group_trips;

DROP POLICY IF EXISTS "Users can view trip participants" ON public.group_trip_participants;
DROP POLICY IF EXISTS "Trip organizers can manage participants" ON public.group_trip_participants;
DROP POLICY IF EXISTS "Users can view their own participant entry" ON public.group_trip_participants;
DROP POLICY IF EXISTS "Organizers can view all participants" ON public.group_trip_participants;
DROP POLICY IF EXISTS "Participants can view other participants in shared trips" ON public.group_trip_participants;
DROP POLICY IF EXISTS "organizers_view_all_participants" ON public.group_trip_participants;
DROP POLICY IF EXISTS "users_manage_own_participation" ON public.group_trip_participants;
DROP POLICY IF EXISTS "organizers_manage_participants" ON public.group_trip_participants;

-- Create security definer function to safely check participation
CREATE OR REPLACE FUNCTION public.is_trip_participant(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- Use SECURITY DEFINER to bypass RLS and prevent recursion
    RETURN EXISTS (
        SELECT 1
        FROM public.group_trip_participants
        WHERE trip_id = p_trip_id AND user_id = p_user_id
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_trip_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_participant(UUID, UUID) TO anon;

-- Recreate non-recursive RLS policies for group_trips
CREATE POLICY "creator_owns_trips" ON public.group_trips
    FOR ALL USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "participants_view_trips" ON public.group_trips
    FOR SELECT USING (public.is_trip_participant(id, auth.uid()));

-- Recreate non-recursive RLS policies for group_trip_participants  
CREATE POLICY "users_own_participation" ON public.group_trip_participants
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "organizers_manage_all_participants" ON public.group_trip_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.group_trips gt
            WHERE gt.id = group_trip_participants.trip_id 
            AND gt.created_by = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_trips gt
            WHERE gt.id = group_trip_participants.trip_id 
            AND gt.created_by = auth.uid()
        )
    );

-- ==============================================
-- 2. Fix agent_logs RLS policy violations
-- ==============================================

-- Ensure agent_logs table exists with proper structure
CREATE TABLE IF NOT EXISTS public.agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'user', -- user, assistant, system
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own logs" ON public.agent_logs;
DROP POLICY IF EXISTS "Users can create logs" ON public.agent_logs;
DROP POLICY IF EXISTS "Service role can manage all logs" ON public.agent_logs;

-- Create proper RLS policies for agent_logs
CREATE POLICY "users_manage_own_logs" ON public.agent_logs
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow service role to bypass RLS for PAM backend operations
CREATE POLICY "service_role_full_access" ON public.agent_logs
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ==============================================
-- 3. Create missing tables
-- ==============================================

-- Create affiliate_sales table
CREATE TABLE IF NOT EXISTS public.affiliate_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    sale_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    vendor_name TEXT,
    product_name TEXT,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'cancelled')),
    payout_date TIMESTAMP WITH TIME ZONE,
    affiliate_network TEXT DEFAULT 'digistore24',
    tracking_id TEXT,
    customer_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for affiliate_sales
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_affiliate_sales" ON public.affiliate_sales
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_manage_own_affiliate_sales" ON public.affiliate_sales
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create user_wishlists table
CREATE TABLE IF NOT EXISTS public.user_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    price DECIMAL(10,2),
    product_url TEXT,
    notes TEXT,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- RLS for user_wishlists
ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_wishlists" ON public.user_wishlists
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- 4. Fix UUID handling for conversations
-- ==============================================

-- Ensure conversations table exists with proper UUID handling
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    messages JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own conversations" ON public.conversations;

-- Create proper RLS policies
CREATE POLICY "users_manage_own_conversations" ON public.conversations
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow service role full access for PAM backend
CREATE POLICY "service_role_conversations_access" ON public.conversations
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ==============================================
-- 5. Create indexes for performance
-- ==============================================

-- Indexes for group_trips and participants
CREATE INDEX IF NOT EXISTS idx_group_trips_created_by ON public.group_trips(created_by);
CREATE INDEX IF NOT EXISTS idx_group_trips_start_date ON public.group_trips(start_date);
CREATE INDEX IF NOT EXISTS idx_group_trip_participants_trip_id ON public.group_trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_group_trip_participants_user_id ON public.group_trip_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_group_trip_participants_trip_user ON public.group_trip_participants(trip_id, user_id);

-- Indexes for agent_logs
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_id ON public.agent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_session_id ON public.agent_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON public.agent_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_session ON public.agent_logs(user_id, session_id);

-- Indexes for affiliate_sales
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_id ON public.affiliate_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_sale_date ON public.affiliate_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_payout_status ON public.affiliate_sales(payout_status);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_date ON public.affiliate_sales(user_id, sale_date);

-- Indexes for user_wishlists
CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON public.user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_priority ON public.user_wishlists(priority);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_created_at ON public.user_wishlists(created_at);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at);

-- ==============================================
-- 6. Update trigger functions for updated_at
-- ==============================================

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to new tables
DROP TRIGGER IF EXISTS update_affiliate_sales_updated_at ON public.affiliate_sales;
CREATE TRIGGER update_affiliate_sales_updated_at
    BEFORE UPDATE ON public.affiliate_sales
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_wishlists_updated_at ON public.user_wishlists;
CREATE TRIGGER update_user_wishlists_updated_at
    BEFORE UPDATE ON public.user_wishlists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_logs_updated_at ON public.agent_logs;
CREATE TRIGGER update_agent_logs_updated_at
    BEFORE UPDATE ON public.agent_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- 7. Ensure proper user_settings structure
-- ==============================================

-- Update user_settings with proper budget_settings default
UPDATE public.user_settings 
SET budget_settings = COALESCE(
    budget_settings, 
    '{"weeklyBudget": 300, "monthlyBudget": 1200, "yearlyBudget": 14400, "currency": "USD"}'::jsonb
)
WHERE budget_settings IS NULL OR budget_settings = '{}'::jsonb;

-- ==============================================
-- 8. Create function to safely get user data for PAM
-- ==============================================

-- Function to get comprehensive user data for PAM without RLS issues
CREATE OR REPLACE FUNCTION public.get_user_comprehensive_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    result JSONB := '{}';
    trip_count INTEGER := 0;
    expense_total DECIMAL := 0;
    social_activity_count INTEGER := 0;
    purchase_count INTEGER := 0;
BEGIN
    -- Get trip count
    SELECT COUNT(*) INTO trip_count
    FROM public.trips
    WHERE user_id = p_user_id;
    
    -- Get expense total
    SELECT COALESCE(SUM(amount), 0) INTO expense_total
    FROM public.expenses
    WHERE user_id = p_user_id;
    
    -- Get social activity count
    SELECT COUNT(*) INTO social_activity_count
    FROM public.social_posts
    WHERE user_id = p_user_id;
    
    -- Get purchase count
    SELECT COUNT(*) INTO purchase_count
    FROM public.affiliate_sales
    WHERE user_id = p_user_id;
    
    -- Build result
    result := jsonb_build_object(
        'total_trips', trip_count,
        'total_expenses', expense_total,
        'total_social_activity', social_activity_count,
        'total_purchases', purchase_count,
        'user_id', p_user_id,
        'generated_at', NOW()
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Return basic structure if any queries fail
        RETURN jsonb_build_object(
            'total_trips', 0,
            'total_expenses', 0,
            'total_social_activity', 0,
            'total_purchases', 0,
            'user_id', p_user_id,
            'error', SQLERRM,
            'generated_at', NOW()
        );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_comprehensive_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_comprehensive_data(UUID) TO service_role;

-- ==============================================
-- 9. Cleanup and optimization
-- ==============================================

-- Analyze tables for better query planning
ANALYZE public.group_trips;
ANALYZE public.group_trip_participants;
ANALYZE public.agent_logs;
ANALYZE public.affiliate_sales;
ANALYZE public.user_wishlists;
ANALYZE public.conversations;

-- ==============================================
-- Migration complete!
-- ==============================================

-- This migration addresses:
-- ✅ Infinite recursion in group_trips RLS policies
-- ✅ Missing affiliate_sales table
-- ✅ Missing user_wishlists table  
-- ✅ agent_logs RLS policy violations
-- ✅ UUID handling for conversations
-- ✅ Performance indexes
-- ✅ Updated_at triggers
-- ✅ Service role access for PAM backend
-- ✅ Comprehensive user data function for PAM

-- ============================================================
-- MIGRATION: 20250805150000-fix-pam-conversation-uuid-issues.sql
-- ============================================================

-- Fix PAM Conversation Storage UUID Issues
-- Resolves: "Error storing conversation: invalid input syntax for type uuid: default"
-- Date: 2025-08-05 15:00:00

-- ==============================================
-- 1. Fix conversation table schema
-- ==============================================

-- Drop the old conversations table that conflicts with PAM conversations
-- This is the user-to-user messaging conversations, not PAM conversations
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Create proper PAM conversations table with consistent UUID handling
CREATE TABLE IF NOT EXISTS public.pam_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    title TEXT,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure one conversation per user (or user-session combination)
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.pam_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for PAM conversations
CREATE POLICY "users_manage_own_pam_conversations" ON public.pam_conversations
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_pam_conversations_access" ON public.pam_conversations
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ==============================================
-- 2. Create PAM messages table
-- ==============================================

CREATE TABLE IF NOT EXISTS public.pam_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.pam_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    intent TEXT,
    confidence DECIMAL(3,2),
    entities JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pam_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for PAM messages
CREATE POLICY "users_view_own_pam_messages" ON public.pam_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pam_conversations pc
            WHERE pc.id = pam_messages.conversation_id
            AND pc.user_id = auth.uid()
        )
    );

CREATE POLICY "users_create_pam_messages" ON public.pam_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pam_conversations pc
            WHERE pc.id = pam_messages.conversation_id
            AND pc.user_id = auth.uid()
        )
    );

CREATE POLICY "service_role_pam_messages_access" ON public.pam_messages
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ==============================================
-- 3. Create missing RPC functions
-- ==============================================

-- Function to get or create PAM conversation with session support
CREATE OR REPLACE FUNCTION public.get_or_create_pam_conversation(
    p_user_id UUID,
    p_session_id TEXT DEFAULT NULL,
    p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    conversation_id UUID;
BEGIN
    -- Try to get existing conversation for user
    SELECT id INTO conversation_id
    FROM public.pam_conversations
    WHERE user_id = p_user_id;
    
    -- If no conversation exists, create one
    IF conversation_id IS NULL THEN
        INSERT INTO public.pam_conversations (
            user_id,
            session_id,
            context_data,
            title
        ) VALUES (
            p_user_id,
            p_session_id,
            p_context,
            'PAM Conversation'
        )
        RETURNING id INTO conversation_id;
    ELSE
        -- Update existing conversation with latest session info
        UPDATE public.pam_conversations
        SET 
            session_id = COALESCE(p_session_id, session_id),
            context_data = COALESCE(p_context, context_data),
            updated_at = NOW()
        WHERE id = conversation_id;
    END IF;
    
    RETURN conversation_id;
END;
$$;

-- Function to store PAM messages
CREATE OR REPLACE FUNCTION public.store_pam_message(
    p_conversation_id UUID,
    p_role TEXT,
    p_content TEXT,
    p_intent TEXT DEFAULT NULL,
    p_confidence DECIMAL DEFAULT NULL,
    p_entities JSONB DEFAULT '{}'::jsonb,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    message_id UUID;
BEGIN
    -- Insert the message
    INSERT INTO public.pam_messages (
        conversation_id,
        role,
        content,
        intent,
        confidence,
        entities,
        metadata
    ) VALUES (
        p_conversation_id,
        p_role,
        p_content,
        p_intent,
        p_confidence,
        p_entities,
        p_metadata
    )
    RETURNING id INTO message_id;
    
    -- Update conversation timestamp
    UPDATE public.pam_conversations
    SET updated_at = NOW()
    WHERE id = p_conversation_id;
    
    RETURN message_id;
END;
$$;

-- Function to get conversation history
CREATE OR REPLACE FUNCTION public.get_conversation_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    role TEXT,
    content TEXT,
    intent TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.role,
        pm.content,
        pm.intent,
        pm.created_at
    FROM public.pam_messages pm
    JOIN public.pam_conversations pc ON pc.id = pm.conversation_id
    WHERE pc.user_id = p_user_id
    ORDER BY pm.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Function to get user preferences (simplified for PAM)
CREATE OR REPLACE FUNCTION public.get_user_preferences(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    preferences JSONB := '{}'::jsonb;
BEGIN
    -- Get preferences from pam_user_context table if it exists
    SELECT COALESCE(
        jsonb_object_agg(context_type, context_value),
        '{}'::jsonb
    ) INTO preferences
    FROM public.pam_user_context
    WHERE user_id = p_user_id;
    
    -- If no preferences found, return default structure
    IF preferences = '{}'::jsonb THEN
        preferences := '{
            "travel_style": "balanced",
            "vehicle_info": {},
            "notifications": {},
            "privacy": {},
            "display": {},
            "integrations": {},
            "travel_preferences": {}
        }'::jsonb;
    END IF;
    
    RETURN preferences;
EXCEPTION
    WHEN OTHERS THEN
        -- Return default preferences if table doesn't exist or other error
        RETURN '{
            "travel_style": "balanced",
            "vehicle_info": {},
            "notifications": {},
            "privacy": {},
            "display": {},
            "integrations": {},
            "travel_preferences": {}
        }'::jsonb;
END;
$$;

-- Function to store user context/preferences
CREATE OR REPLACE FUNCTION public.store_user_context(
    p_user_id UUID,
    p_context_type TEXT,
    p_key TEXT,
    p_value TEXT,
    p_confidence DECIMAL DEFAULT 1.0,
    p_source TEXT DEFAULT 'conversation'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    -- Create the pam_user_context table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.pam_user_context (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        context_type TEXT NOT NULL,
        context_key TEXT NOT NULL,
        context_value TEXT,
        confidence DECIMAL(3,2) DEFAULT 1.0,
        source TEXT DEFAULT 'conversation',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, context_type, context_key)
    );
    
    -- Insert or update the context
    INSERT INTO public.pam_user_context (
        user_id,
        context_type,
        context_key,
        context_value,
        confidence,
        source
    ) VALUES (
        p_user_id,
        p_context_type,
        p_key,
        p_value,
        p_confidence,
        p_source
    )
    ON CONFLICT (user_id, context_type, context_key)
    DO UPDATE SET
        context_value = EXCLUDED.context_value,
        confidence = EXCLUDED.confidence,
        source = EXCLUDED.source,
        last_updated = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- ==============================================
-- 4. Create indexes for performance
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_pam_conversations_user_id ON public.pam_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_conversations_session_id ON public.pam_conversations(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pam_conversations_updated_at ON public.pam_conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_pam_messages_conversation_id ON public.pam_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pam_messages_role ON public.pam_messages(role);
CREATE INDEX IF NOT EXISTS idx_pam_messages_created_at ON public.pam_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pam_messages_conv_created ON public.pam_messages(conversation_id, created_at DESC);

-- ==============================================
-- 5. Grant permissions
-- ==============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_or_create_pam_conversation(UUID, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.store_pam_message(UUID, TEXT, TEXT, TEXT, DECIMAL, JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_conversation_history(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_preferences(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.store_user_context(UUID, TEXT, TEXT, TEXT, DECIMAL, TEXT) TO authenticated, service_role;

-- ==============================================
-- 6. Create updated_at trigger
