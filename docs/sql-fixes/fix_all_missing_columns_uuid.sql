-- Fix All Missing Database Columns (Problem #8) - CORRECTED VERSION
-- Safe to run multiple times (idempotent with IF NOT EXISTS guards)
-- Run this in Supabase SQL Editor
--
-- CRITICAL FIX: Uses UUID for all id columns (not BIGSERIAL/BIGINT)
-- This matches existing Supabase schema conventions

-- ============================================================================
-- 1. PAM Savings Tables (complete schema with UUID)
-- ============================================================================

-- Recommendations table (UUID primary key to match existing schema)
CREATE TABLE IF NOT EXISTS public.pam_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    recommendation_type TEXT DEFAULT 'general',
    predicted_savings DECIMAL(10,2),
    savings_confidence DECIMAL(3,2) DEFAULT 0.70,
    priority_level TEXT DEFAULT 'medium',
    is_applied BOOLEAN DEFAULT false,
    applied_date TIMESTAMPTZ,
    tracking_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings events table with UUID foreign key
CREATE TABLE IF NOT EXISTS public.pam_savings_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    recommendation_id UUID REFERENCES pam_recommendations(id),
    savings_type TEXT NOT NULL,
    predicted_savings DECIMAL(10,2) DEFAULT 0,
    actual_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    baseline_cost DECIMAL(10,2) NOT NULL,
    optimized_cost DECIMAL(10,2) NOT NULL,
    savings_description TEXT,
    verification_method TEXT,
    confidence_score DECIMAL(3,2) DEFAULT 0.80,
    location GEOGRAPHY(POINT, 4326),
    category TEXT DEFAULT 'other',
    metadata JSONB DEFAULT '{}',
    saved_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists (UUID type for recommendation_id)
ALTER TABLE public.pam_savings_events
    ADD COLUMN IF NOT EXISTS recommendation_id UUID REFERENCES pam_recommendations(id),
    ADD COLUMN IF NOT EXISTS savings_type TEXT,
    ADD COLUMN IF NOT EXISTS predicted_savings DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS actual_savings DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS baseline_cost DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS optimized_cost DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS savings_description TEXT,
    ADD COLUMN IF NOT EXISTS verification_method TEXT,
    ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.80,
    ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326),
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS saved_date DATE DEFAULT CURRENT_DATE;

-- Monthly summary table (UUID primary key)
CREATE TABLE IF NOT EXISTS public.monthly_savings_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    subscription_cost DECIMAL(10,2) NOT NULL DEFAULT 14.00,
    total_predicted_savings DECIMAL(10,2) DEFAULT 0,
    total_actual_savings DECIMAL(10,2) DEFAULT 0,
    savings_events_count INTEGER DEFAULT 0,
    guarantee_met BOOLEAN DEFAULT false,
    guarantee_amount DECIMAL(10,2) DEFAULT 0,
    evaluation_date TIMESTAMPTZ,
    processed_date TIMESTAMPTZ,
    refund_status TEXT DEFAULT 'pending',
    refund_amount DECIMAL(10,2),
    refund_transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, billing_period_start)
);

-- Guarantee history table (UUID primary key)
CREATE TABLE IF NOT EXISTS public.savings_guarantee_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    billing_period DATE NOT NULL,
    evaluation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_savings DECIMAL(10,2) NOT NULL,
    subscription_cost DECIMAL(10,2) NOT NULL,
    guarantee_met BOOLEAN NOT NULL,
    refund_issued BOOLEAN DEFAULT false,
    refund_amount DECIMAL(10,2),
    refund_method TEXT,
    stripe_refund_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for savings tables
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_date ON pam_savings_events(user_id, saved_date);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_category ON pam_savings_events(category);
CREATE INDEX IF NOT EXISTS idx_monthly_summary_user_period ON monthly_savings_summary(user_id, billing_period_start);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_user ON pam_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_guarantee_history_user ON savings_guarantee_history(user_id, billing_period);

-- ============================================================================
-- 2. PAM Analytics Logs (add event_data column)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pam_analytics_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    intent TEXT,
    response_time_ms INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns for analytics
ALTER TABLE public.pam_analytics_logs
    ADD COLUMN IF NOT EXISTS event_type TEXT,
    ADD COLUMN IF NOT EXISTS event_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS session_id TEXT,
    ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_pam_analytics_user_type ON pam_analytics_logs(user_id, event_type);

-- ============================================================================
-- 3. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.pam_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_savings_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_savings_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_guarantee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_analytics_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (using DO block for idempotency)
DO $$
BEGIN
    -- pam_recommendations policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_recommendations' AND policyname = 'Users can view own recommendations') THEN
        EXECUTE 'CREATE POLICY "Users can view own recommendations" ON pam_recommendations FOR SELECT USING (auth.uid() = user_id)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_recommendations' AND policyname = 'Users can insert own recommendations') THEN
        EXECUTE 'CREATE POLICY "Users can insert own recommendations" ON pam_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_recommendations' AND policyname = 'Users can update own recommendations') THEN
        EXECUTE 'CREATE POLICY "Users can update own recommendations" ON pam_recommendations FOR UPDATE USING (auth.uid() = user_id)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_recommendations' AND policyname = 'Users can delete own recommendations') THEN
        EXECUTE 'CREATE POLICY "Users can delete own recommendations" ON pam_recommendations FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- pam_savings_events policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_savings_events' AND policyname = 'Users can view own savings events') THEN
        EXECUTE 'CREATE POLICY "Users can view own savings events" ON pam_savings_events FOR SELECT USING (auth.uid() = user_id)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_savings_events' AND policyname = 'Users can insert own savings events') THEN
        EXECUTE 'CREATE POLICY "Users can insert own savings events" ON pam_savings_events FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_savings_events' AND policyname = 'Users can update own savings events') THEN
        EXECUTE 'CREATE POLICY "Users can update own savings events" ON pam_savings_events FOR UPDATE USING (auth.uid() = user_id)';
    END IF;

    -- monthly_savings_summary policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'monthly_savings_summary' AND policyname = 'Users can view own monthly summary') THEN
        EXECUTE 'CREATE POLICY "Users can view own monthly summary" ON monthly_savings_summary FOR SELECT USING (auth.uid() = user_id)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'monthly_savings_summary' AND policyname = 'Users can insert own monthly summary') THEN
        EXECUTE 'CREATE POLICY "Users can insert own monthly summary" ON monthly_savings_summary FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'monthly_savings_summary' AND policyname = 'Users can update own monthly summary') THEN
        EXECUTE 'CREATE POLICY "Users can update own monthly summary" ON monthly_savings_summary FOR UPDATE USING (auth.uid() = user_id)';
    END IF;

    -- savings_guarantee_history policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'savings_guarantee_history' AND policyname = 'Users can view own guarantee history') THEN
        EXECUTE 'CREATE POLICY "Users can view own guarantee history" ON savings_guarantee_history FOR SELECT USING (auth.uid() = user_id)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'savings_guarantee_history' AND policyname = 'Users can insert own guarantee history') THEN
        EXECUTE 'CREATE POLICY "Users can insert own guarantee history" ON savings_guarantee_history FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;

    -- pam_analytics_logs policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_analytics_logs' AND policyname = 'Users can select own PAM analytics') THEN
        EXECUTE 'CREATE POLICY "Users can select own PAM analytics" ON pam_analytics_logs FOR SELECT USING (auth.uid() = user_id)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_analytics_logs' AND policyname = 'Users can insert own PAM analytics') THEN
        EXECUTE 'CREATE POLICY "Users can insert own PAM analytics" ON pam_analytics_logs FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_analytics_logs' AND policyname = 'Users can update own PAM analytics') THEN
        EXECUTE 'CREATE POLICY "Users can update own PAM analytics" ON pam_analytics_logs FOR UPDATE USING (auth.uid() = user_id)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_analytics_logs' AND policyname = 'Users can delete own PAM analytics') THEN
        EXECUTE 'CREATE POLICY "Users can delete own PAM analytics" ON pam_analytics_logs FOR DELETE USING (auth.uid() = user_id)';
    END IF;
END $$ LANGUAGE plpgsql;
