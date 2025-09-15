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