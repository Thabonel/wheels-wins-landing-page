    UPDATE public.community_tips
    SET
        use_count = use_count + 1,
        last_used_at = NOW()
    WHERE id = NEW.tip_id;

    -- Update contributor stats
    UPDATE public.user_contribution_stats
    SET
        total_tip_uses = total_tip_uses + 1,
        people_helped = (
            SELECT COUNT(DISTINCT beneficiary_id)
            FROM public.tip_usage_log
            WHERE contributor_id = NEW.contributor_id
            AND beneficiary_id IS NOT NULL
        ),
        reputation_points = reputation_points + 10, -- 10 points per use
        updated_at = NOW()
    WHERE user_id = NEW.contributor_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stats_on_tip_usage
    AFTER INSERT ON public.tip_usage_log
    FOR EACH ROW
    EXECUTE FUNCTION update_stats_on_tip_usage();

-- ============================================================================
-- Helper Functions for PAM
-- ============================================================================

-- Search tips by keyword
CREATE OR REPLACE FUNCTION search_community_tips(
    p_query TEXT,
    p_category TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    contributor_username TEXT,
    use_count INTEGER,
    helpful_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ct.id,
        ct.title,
        ct.content,
        ct.category,
        COALESCE(p.username, 'Anonymous') as contributor_username,
        ct.use_count,
        ct.helpful_count
    FROM public.community_tips ct
    LEFT JOIN public.profiles p ON p.user_id = ct.user_id
    WHERE
        ct.status = 'active'
        AND (p_category IS NULL OR ct.category = p_category)
        AND (
            to_tsvector('english', ct.title || ' ' || ct.content) @@ plainto_tsquery('english', p_query)
            OR ct.tags && ARRAY[p_query]::TEXT[]
        )
    ORDER BY
        ct.helpful_count DESC,
        ct.use_count DESC,
        ct.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's contribution stats
CREATE OR REPLACE FUNCTION get_user_contribution_stats(p_user_id UUID)
RETURNS TABLE (
    tips_shared INTEGER,
    people_helped INTEGER,
    total_tip_uses INTEGER,
    reputation_level INTEGER,
    badges JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(s.tips_shared, 0),
        COALESCE(s.people_helped, 0),
        COALESCE(s.total_tip_uses, 0),
        COALESCE(s.reputation_level, 1),
        COALESCE(s.badges, '[]'::JSONB)
    FROM public.user_contribution_stats s
    WHERE s.user_id = p_user_id;

    -- Return zeros if no stats exist yet
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 0, 1, '[]'::JSONB;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get community stats for homepage
CREATE OR REPLACE FUNCTION get_community_stats()
RETURNS TABLE (
    total_tips INTEGER,
    total_contributors INTEGER,
    total_people_helped INTEGER,
    total_tip_uses INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT ct.id)::INTEGER as total_tips,
        COUNT(DISTINCT ct.user_id)::INTEGER as total_contributors,
        SUM(s.people_helped)::INTEGER as total_people_helped,
        SUM(s.total_tip_uses)::INTEGER as total_tip_uses
    FROM public.community_tips ct
    LEFT JOIN public.user_contribution_stats s ON s.user_id = ct.user_id
    WHERE ct.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT SELECT ON public.community_tips TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_tips TO authenticated;

GRANT SELECT ON public.tip_usage_log TO authenticated;

GRANT SELECT ON public.user_contribution_stats TO authenticated;

-- Service role needs full access for PAM
GRANT ALL ON public.community_tips TO service_role;
GRANT ALL ON public.tip_usage_log TO service_role;
GRANT ALL ON public.user_contribution_stats TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION search_community_tips TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_contribution_stats TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_community_stats TO authenticated, service_role;

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Insert sample tip (will be replaced by real user contributions)
-- Commented out - uncomment to add sample data
/*
INSERT INTO public.community_tips (
    user_id,
    title,
    content,
    category,
    location_name,
    tags
) VALUES (
    (SELECT id FROM auth.users LIMIT 1), -- Use first user as example
    'Yellowstone fills up early in summer',
    'If you''re visiting Yellowstone in June-August, arrive at Fishing Bridge RV Park before 8am or you won''t get a spot. Alternatively, book 6 months in advance.',
    'camping',
    'Yellowstone National Park',
    ARRAY['yellowstone', 'camping', 'summer', 'early_arrival']
);
*/

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.community_tips IS 'User-contributed tips that PAM uses to help other travelers';
COMMENT ON TABLE public.tip_usage_log IS 'Tracks when PAM uses a community tip to help someone';
COMMENT ON TABLE public.user_contribution_stats IS 'Aggregated contribution statistics for user dashboards';

COMMENT ON COLUMN public.community_tips.use_count IS 'Number of times PAM used this tip in responses';
COMMENT ON COLUMN public.community_tips.helpful_count IS 'Number of user upvotes (future feature)';
COMMENT ON COLUMN public.user_contribution_stats.people_helped IS 'Count of unique users who benefited from this contributor''s tips';
COMMENT ON COLUMN public.user_contribution_stats.reputation_points IS 'Points earned from contributions (10 per tip use)';


-- ============================================================
-- MIGRATION: 20250112000001_create_user_usage_quotas.sql
-- ============================================================

CREATE TABLE user_usage_quotas (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_tier TEXT NOT NULL DEFAULT 'free_trial',
    monthly_query_limit INTEGER NOT NULL DEFAULT 100,
    queries_used_this_month INTEGER NOT NULL DEFAULT 0,
    monthly_reset_date DATE NOT NULL DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month'),
    total_tokens_used BIGINT DEFAULT 0,
    total_cost_usd DECIMAL(10,4) DEFAULT 0,
    overage_queries INTEGER DEFAULT 0,
    last_query_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_usage_quotas_user_id ON user_usage_quotas(user_id);
CREATE INDEX idx_user_usage_quotas_reset_date ON user_usage_quotas(monthly_reset_date);

ALTER TABLE user_usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_usage_quotas_select ON user_usage_quotas
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY user_usage_quotas_update ON user_usage_quotas
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY user_usage_quotas_service_role ON user_usage_quotas
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_user_usage_quotas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_usage_quotas_updated_at
    BEFORE UPDATE ON user_usage_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_user_usage_quotas_updated_at();


-- ============================================================
-- MIGRATION: 20250112000002_create_pam_usage_logs.sql
-- ============================================================

CREATE TABLE pam_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES pam_conversations(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    model_used TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    estimated_cost_usd DECIMAL(8,6) NOT NULL,
    intent TEXT,
    tool_names TEXT[],
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pam_usage_logs_user_id ON pam_usage_logs(user_id);
CREATE INDEX idx_pam_usage_logs_timestamp ON pam_usage_logs(timestamp DESC);
CREATE INDEX idx_pam_usage_logs_conversation_id ON pam_usage_logs(conversation_id);
CREATE INDEX idx_pam_usage_logs_model_used ON pam_usage_logs(model_used);

ALTER TABLE pam_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pam_usage_logs_select ON pam_usage_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY pam_usage_logs_insert ON pam_usage_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY pam_usage_logs_service_role ON pam_usage_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE pam_usage_logs IS 'Logs every PAM query with token counts and costs for billing and analytics';
COMMENT ON COLUMN pam_usage_logs.model_used IS 'AI model used: claude-sonnet-4-5, gpt-5-1-instant, etc.';
COMMENT ON COLUMN pam_usage_logs.total_tokens IS 'Sum of input_tokens + output_tokens';
COMMENT ON COLUMN pam_usage_logs.estimated_cost_usd IS 'Calculated cost based on model pricing';
COMMENT ON COLUMN pam_usage_logs.tool_names IS 'Array of PAM tools executed during this query';


-- ============================================================
-- MIGRATION: 20250112000003_add_quota_tier_to_subscriptions.sql
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_usage_warnings BOOLEAN DEFAULT true;

ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS quota_tier TEXT DEFAULT 'standard';

COMMENT ON COLUMN profiles.show_usage_warnings IS 'Whether to show usage warning toasts to this user';
COMMENT ON COLUMN user_subscriptions.quota_tier IS 'Quota tier: standard, power_user, unlimited';

CREATE OR REPLACE FUNCTION initialize_user_quota()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_usage_quotas (user_id, subscription_tier, monthly_query_limit)
    VALUES (
        NEW.id,
        COALESCE(
            (SELECT plan_type FROM user_subscriptions WHERE user_id = NEW.id LIMIT 1),
            'free_trial'
        ),
        CASE
            WHEN (SELECT plan_type FROM user_subscriptions WHERE user_id = NEW.id LIMIT 1) = 'free_trial' THEN 50
            WHEN (SELECT plan_type FROM user_subscriptions WHERE user_id = NEW.id LIMIT 1) = 'monthly' THEN 100
            WHEN (SELECT plan_type FROM user_subscriptions WHERE user_id = NEW.id LIMIT 1) = 'annual' THEN 150
            WHEN (SELECT plan_type FROM user_subscriptions WHERE user_id = NEW.id LIMIT 1) = 'lifetime' THEN 200
            ELSE 100
        END
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER initialize_user_quota_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_user_quota();

CREATE OR REPLACE FUNCTION update_quota_on_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_usage_quotas
    SET
        subscription_tier = NEW.plan_type,
        monthly_query_limit = CASE
            WHEN NEW.plan_type = 'free_trial' THEN 50
            WHEN NEW.plan_type = 'monthly' THEN 100
            WHEN NEW.plan_type = 'annual' THEN 150
            WHEN NEW.plan_type = 'lifetime' THEN 200
            ELSE 100
        END
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quota_on_subscription_change_trigger
    AFTER INSERT OR UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_quota_on_subscription_change();


-- ============================================================
-- MIGRATION: 20250112000004_create_increment_quota_function.sql
-- ============================================================

CREATE OR REPLACE FUNCTION increment_user_quota(
    p_user_id UUID,
    p_tokens BIGINT,
    p_cost DECIMAL(10,6)
)
RETURNS VOID AS $$
BEGIN
    UPDATE user_usage_quotas
    SET
        queries_used_this_month = queries_used_this_month + 1,
        total_tokens_used = total_tokens_used + p_tokens,
        total_cost_usd = total_cost_usd + p_cost,
        overage_queries = CASE
            WHEN queries_used_this_month >= monthly_query_limit
            THEN overage_queries + 1
            ELSE overage_queries
        END,
        last_query_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        INSERT INTO user_usage_quotas (
            user_id,
            queries_used_this_month,
            total_tokens_used,
            total_cost_usd
        ) VALUES (
            p_user_id,
            1,
            p_tokens,
            p_cost
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_user_quota IS 'Atomically increment user quota counters after a PAM query';


-- ============================================================
-- MIGRATION: 20250115_add_price_scraping_infrastructure.sql
-- ============================================================

-- Migration: Add price scraping infrastructure
-- Created: 2025-01-15
-- Purpose: Support automated Amazon price scraping with error tracking and history

-- Add error tracking columns to affiliate_products
ALTER TABLE public.affiliate_products
ADD COLUMN IF NOT EXISTS api_last_error text,
ADD COLUMN IF NOT EXISTS api_error_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_scraped_price numeric,
ADD COLUMN IF NOT EXISTS scrape_batch_number integer DEFAULT 0;

-- Add index for efficient batch scraping queries
CREATE INDEX IF NOT EXISTS idx_affiliate_products_scrape_batch
ON public.affiliate_products(scrape_batch_number, is_active)
WHERE is_active = true;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create cron job to scrape Amazon prices daily at 6 AM UTC
-- Note: Replace YOUR_CRON_SECRET_HERE with actual value from Supabase Edge Function secrets
-- The cron job in the database has already been configured with the correct secret
SELECT cron.schedule(
  'scrape-amazon-prices-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/scrape-amazon-prices',
    headers := '{"Content-Type": "application/json", "X-Cron-Secret": "YOUR_CRON_SECRET_HERE"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Documentation comments
COMMENT ON COLUMN public.affiliate_products.api_last_error IS 'Last error message from price scraping';
COMMENT ON COLUMN public.affiliate_products.api_error_count IS 'Number of consecutive scraping failures (max 5 before skip)';
COMMENT ON COLUMN public.affiliate_products.last_scraped_price IS 'Last price successfully scraped from Amazon';
COMMENT ON COLUMN public.affiliate_products.scrape_batch_number IS 'Batch assignment for distributed scraping (0-9)';


-- ============================================================
-- MIGRATION: 20250201000000-add-start-transition-profile-function.sql
-- ============================================================

-- Migration: add start_transition_profile RPC helper
-- Purpose: allow authenticated users to create or enable their transition profile without RLS violations
-- Adds a SECURITY DEFINER function that wraps the transition_profiles upsert logic using auth.uid()

create or replace function public.start_transition_profile(
    p_departure_date date default null,
    p_is_enabled boolean default true
) returns public.transition_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_departure_date date := coalesce(p_departure_date, (now() at time zone 'utc')::date + 90);
    v_profile public.transition_profiles;
begin
    if v_user_id is null then
        raise exception 'start_transition_profile requires an authenticated user'
            using errcode = 'P0001';
    end if;

    insert into public.transition_profiles as tp (
        user_id,
        departure_date,
        is_enabled,
        updated_at
    )
    values (
        v_user_id,
        v_departure_date,
        coalesce(p_is_enabled, true),
        now()
    )
    on conflict (user_id) do update
        set departure_date = excluded.departure_date,
            is_enabled = excluded.is_enabled,
            updated_at = now()
    returning tp.* into v_profile;

    return v_profile;
end;
$$;

revoke all on function public.start_transition_profile(date, boolean) from public;
-- Ensure logged-in users can execute the helper while anonymous users cannot
grant execute on function public.start_transition_profile(date, boolean) to authenticated;
-- Allow backend service role to call the helper for automation tasks
grant execute on function public.start_transition_profile(date, boolean) to service_role;


-- ============================================================
-- MIGRATION: 20250722000000-add-user-feedback-table.sql
-- ============================================================

-- Create user_feedback table for PAM feedback and issue reporting
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Feedback identification
    type VARCHAR(50) NOT NULL CHECK (type IN ('bug', 'suggestion', 'issue', 'complaint', 'feature_request')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('voice', 'calendar', 'maps', 'ui', 'performance', 'general')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status VARCHAR(20) NOT NULL CHECK (status IN ('new', 'in_progress', 'resolved', 'closed', 'duplicate')) DEFAULT 'new',
    
    -- Content
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    user_message TEXT NOT NULL, -- Original user message
    
    -- User information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    
    -- Context and metadata
    user_context JSONB DEFAULT '{}', -- Page, action, device, browser info
    metadata JSONB DEFAULT '{}', -- Additional data like timestamp, session_id, source
    
    -- Admin response
    admin_response TEXT,
    admin_notes TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category ON user_feedback(category);
CREATE INDEX IF NOT EXISTS idx_user_feedback_severity ON user_feedback(severity);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_status_severity ON user_feedback(status, severity);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category_type ON user_feedback(category, type);

-- Enable Row Level Security
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can insert their own feedback (including anonymous)
CREATE POLICY "Users can insert feedback" ON user_feedback
    FOR INSERT 
    WITH CHECK (
        user_id IS NULL OR user_id = auth.uid()
    );

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON user_feedback
    FOR SELECT 
    USING (
        user_id = auth.uid()
    );

-- Admin users can view all feedback
CREATE POLICY "Admins can view all feedback" ON user_feedback
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email IN ('admin@wheelsandwins.com', 'thabonel0@gmail.com')
        )
    );

-- Admin users can update feedback (status, response, etc.)
CREATE POLICY "Admins can update feedback" ON user_feedback
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email IN ('admin@wheelsandwins.com', 'thabonel0@gmail.com')
        )
    );

-- Admin users can delete feedback if needed
CREATE POLICY "Admins can delete feedback" ON user_feedback
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email IN ('admin@wheelsandwins.com', 'thabonel0@gmail.com')
        )
    );

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Set resolved_at when status changes to resolved
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolved_at = NOW();
    END IF;
    
    -- Clear resolved_at if status changes away from resolved
    IF NEW.status != 'resolved' AND OLD.status = 'resolved' THEN
        NEW.resolved_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_feedback_updated_at_trigger
    BEFORE UPDATE ON user_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_user_feedback_updated_at();

-- Add some helpful comments
COMMENT ON TABLE user_feedback IS 'User feedback, bug reports, and feature requests collected via PAM and other channels';
COMMENT ON COLUMN user_feedback.type IS 'Type of feedback: bug, suggestion, issue, complaint, feature_request';
COMMENT ON COLUMN user_feedback.category IS 'Area of the application: voice, calendar, maps, ui, performance, general';
COMMENT ON COLUMN user_feedback.severity IS 'Impact level: low, medium, high, critical';
COMMENT ON COLUMN user_feedback.status IS 'Current status: new, in_progress, resolved, closed, duplicate';
COMMENT ON COLUMN user_feedback.user_message IS 'Original message from user (e.g., from PAM conversation)';
COMMENT ON COLUMN user_feedback.user_context IS 'Context data: page, action, device, browser information';
COMMENT ON COLUMN user_feedback.metadata IS 'Additional metadata: timestamp, session_id, source, etc.';

-- ============================================================
-- MIGRATION: 20250722110037-e81134db-41ef-478d-95a8-466da76f6efb.sql
-- ============================================================

-- Create income_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.income_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT DEFAULT 'income',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for income_entries
CREATE POLICY "Users can view their own income entries"
ON public.income_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own income entries"
ON public.income_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income entries"
ON public.income_entries
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income entries"
ON public.income_entries
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_income_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_income_entries_updated_at
  BEFORE UPDATE ON public.income_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_income_entries_updated_at();

-- ============================================================
-- MIGRATION: 20250722110239-f7026dd7-bcec-4303-a441-33c32e213b27.sql
-- ============================================================

-- Create user_feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'feedback',
  category TEXT NOT NULL DEFAULT 'general', 
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  user_message TEXT NOT NULL,
  user_email TEXT,
  user_context JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  admin_response TEXT,
  admin_notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for user_feedback
CREATE POLICY "Admins can view all user feedback"
ON public.user_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND status = 'active'
  )
);

CREATE POLICY "Admins can manage all user feedback"
ON public.user_feedback
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND status = 'active'
  )
);

CREATE POLICY "Users can create their own feedback"
ON public.user_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
ON public.user_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_feedback_updated_at
  BEFORE UPDATE ON public.user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_feedback_updated_at();

-- ============================================================
-- MIGRATION: 20250722140000-fix-database-issues.sql
-- ============================================================

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

-- ============================================================
-- MIGRATION: 20250722150000-add-receipt-url-to-expenses.sql
-- ============================================================

-- Add receipt_url column to expenses table for receipt photo storage
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN expenses.receipt_url IS 'URL to the uploaded receipt image in Supabase storage';

-- Create index for faster queries on expenses with receipts
CREATE INDEX IF NOT EXISTS idx_expenses_receipt_url 
ON expenses(user_id, receipt_url) 
WHERE receipt_url IS NOT NULL;

-- ============================================================
-- MIGRATION: 20250722151000-create-receipts-storage-policies.sql
-- ============================================================

-- Create receipts storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,  -- Public read access
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for receipts bucket

-- Policy: Users can upload receipts to their own folder
CREATE POLICY "Users can upload their own receipts" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own receipts
CREATE POLICY "Users can update their own receipts" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own receipts
CREATE POLICY "Users can delete their own receipts" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view receipts (public bucket)
CREATE POLICY "Anyone can view receipts" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'receipts');

-- ============================================================
-- MIGRATION: 20250723120000-add-trip-template-functions.sql
-- ============================================================

-- Trip Template Helper Functions
-- Function to increment template usage count

CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE trip_templates 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get regional trip templates with fallback
CREATE OR REPLACE FUNCTION get_regional_trip_templates(user_region TEXT, max_results INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    template_data JSONB,
    category TEXT,
    tags TEXT[],
    usage_count INTEGER,
    is_public BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- First try to get region-specific templates
    RETURN QUERY
    SELECT t.id, t.name, t.description, t.template_data, t.category, t.tags, t.usage_count, t.is_public, t.created_at, t.updated_at
    FROM trip_templates t
    WHERE t.is_public = true 
    AND (t.template_data->>'region' = user_region OR t.template_data->>'region' IS NULL)
    ORDER BY t.usage_count DESC, t.created_at DESC
    LIMIT max_results;
    
    -- If no results, try to get any public templates
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT t.id, t.name, t.description, t.template_data, t.category, t.tags, t.usage_count, t.is_public, t.created_at, t.updated_at
        FROM trip_templates t
        WHERE t.is_public = true
        ORDER BY t.usage_count DESC, t.created_at DESC
        LIMIT max_results;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_template_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_regional_trip_templates(TEXT, INTEGER) TO authenticated, anon;

-- ============================================================
-- MIGRATION: 20250723234133-7d90a3c3-228d-4d34-ba6e-894972a7e76b.sql
-- ============================================================

-- Create trip_templates table
CREATE TABLE IF NOT EXISTS public.trip_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  is_public BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for trip_templates
CREATE POLICY "Users can view public trip templates" 
ON public.trip_templates 
FOR SELECT 
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own trip templates" 
ON public.trip_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own trip templates" 
ON public.trip_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip templates" 
ON public.trip_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_trip_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trip_templates_updated_at
BEFORE UPDATE ON public.trip_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_trip_templates_updated_at();

-- Create function to increment template usage
CREATE OR REPLACE FUNCTION public.increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.trip_templates 
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- MIGRATION: 20250723234255-6076fe5e-219c-434d-a0fd-9124918dbb88.sql
-- ============================================================

-- Fix search path security for the new function
CREATE OR REPLACE FUNCTION public.increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.trip_templates 
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';

-- ============================================================
-- MIGRATION: 20250725043028-38995e42-75a7-4cd3-97f4-276a6048197f.sql
-- ============================================================

