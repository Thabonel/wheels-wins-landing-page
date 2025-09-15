-- PAM Savings Guarantee Implementation - Database Foundation
-- Creates tables for tracking PAM's money-saving recommendations and guarantee system
-- Migration: 2025-08-07 22:29:25

-- =====================================================
-- 1. CREATE PAM RECOMMENDATIONS TABLE
-- =====================================================

-- Table for PAM recommendations with savings prediction capabilities
CREATE TABLE IF NOT EXISTS public.pam_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'fuel_optimization', 'camping_alternative', 'route_optimization',
        'budget_reallocation', 'price_comparison', 'timing_optimization',
        'maintenance_prevention', 'group_booking_discount', 'general'
    )),
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
        'cost_saving', 'route_optimization', 'time_saving', 
        'safety_improvement', 'convenience', 'experience_enhancement'
    )),
    predicted_savings DECIMAL(10,2) DEFAULT 0 CHECK (predicted_savings >= 0),
    savings_confidence DECIMAL(3,2) DEFAULT 0.5 CHECK (savings_confidence BETWEEN 0 AND 1),
    baseline_cost_estimate DECIMAL(10,2) DEFAULT 0 CHECK (baseline_cost_estimate >= 0),
    optimized_cost_estimate DECIMAL(10,2) DEFAULT 0 CHECK (optimized_cost_estimate >= 0),
    actual_savings_recorded DECIMAL(10,2) DEFAULT 0 CHECK (actual_savings_recorded >= 0),
    priority_level TEXT NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
    time_sensitive BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    user_viewed BOOLEAN DEFAULT FALSE,
    user_acted BOOLEAN DEFAULT FALSE,
    user_feedback_rating INTEGER CHECK (user_feedback_rating BETWEEN 1 AND 5),
    tracking_enabled BOOLEAN DEFAULT TRUE,
    location GEOGRAPHY(POINT, 4326), -- For location-based recommendations
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE PAM SAVINGS EVENTS TABLE
-- =====================================================

-- Table for tracking individual savings events where PAM helps users save money
CREATE TABLE IF NOT EXISTS public.pam_savings_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_id UUID REFERENCES public.pam_recommendations(id) ON DELETE SET NULL,
    savings_type TEXT NOT NULL CHECK (savings_type IN (
        'fuel_cost', 'accommodation_cost', 'food_cost', 'activity_cost',
        'maintenance_cost', 'route_optimization', 'timing_optimization',
        'bulk_purchase', 'discount_found', 'alternative_found', 'general'
    )),
    predicted_savings DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (predicted_savings >= 0),
    actual_savings DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (actual_savings >= 0),
    baseline_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (baseline_cost >= 0),
    optimized_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (optimized_cost >= 0),
    savings_description TEXT NOT NULL,
    verification_method TEXT NOT NULL DEFAULT 'user_reported' CHECK (verification_method IN (
        'user_reported', 'receipt_analysis', 'price_comparison', 
        'booking_confirmation', 'automated_detection', 'third_party_verification'
    )),
    confidence_score DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_score BETWEEN 0 AND 1),
    location GEOGRAPHY(POINT, 4326), -- Location where savings occurred
    category TEXT NOT NULL DEFAULT 'general',
    saved_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE MONTHLY SAVINGS SUMMARY TABLE
-- =====================================================

-- Table for tracking monthly savings summaries and guarantee evaluations
CREATE TABLE IF NOT EXISTS public.pam_monthly_savings_summary (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    subscription_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (subscription_cost >= 0),
    total_predicted_savings DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_predicted_savings >= 0),
    total_actual_savings DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_actual_savings >= 0),
    savings_events_count INTEGER NOT NULL DEFAULT 0 CHECK (savings_events_count >= 0),
    guarantee_met BOOLEAN NOT NULL DEFAULT FALSE,
    guarantee_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (guarantee_amount >= 0),
    evaluation_date DATE,
    processed_date TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique summary per user per billing period
    UNIQUE(user_id, billing_period_start, billing_period_end)
);

-- =====================================================
-- 4. CREATE SAVINGS GUARANTEE EVALUATIONS TABLE
-- =====================================================

-- Table for tracking guarantee evaluations and processing results
CREATE TABLE IF NOT EXISTS public.pam_savings_guarantee_evaluations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_summary_id BIGINT REFERENCES public.pam_monthly_savings_summary(id) ON DELETE CASCADE,
    evaluation_period_start DATE NOT NULL,
    evaluation_period_end DATE NOT NULL,
    total_subscription_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_subscription_cost >= 0),
    total_savings_achieved DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_savings_achieved >= 0),
    savings_shortfall DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (savings_shortfall >= 0),
    guarantee_status TEXT NOT NULL CHECK (guarantee_status IN (
        'pending', 'met', 'not_met', 'processing', 'completed', 'disputed'
    )),
    refund_amount DECIMAL(10,2) DEFAULT 0 CHECK (refund_amount >= 0),
    refund_processed BOOLEAN DEFAULT FALSE,
    refund_date TIMESTAMPTZ,
    evaluation_notes TEXT,
    processed_by TEXT, -- Admin or system identifier
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for pam_recommendations
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_user_id ON public.pam_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_category ON public.pam_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_created_at ON public.pam_recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_expires_at ON public.pam_recommendations(expires_at) WHERE expires_at IS NOT NULL;

-- Indexes for pam_savings_events
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_id ON public.pam_savings_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_recommendation_id ON public.pam_savings_events(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_saved_date ON public.pam_savings_events(saved_date);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_category ON public.pam_savings_events(category);

-- Indexes for pam_monthly_savings_summary
CREATE INDEX IF NOT EXISTS idx_pam_monthly_summary_user_id ON public.pam_monthly_savings_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_monthly_summary_period ON public.pam_monthly_savings_summary(billing_period_start, billing_period_end);

-- Indexes for pam_savings_guarantee_evaluations
CREATE INDEX IF NOT EXISTS idx_pam_guarantee_evaluations_user_id ON public.pam_savings_guarantee_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_guarantee_evaluations_period ON public.pam_savings_guarantee_evaluations(evaluation_period_start, evaluation_period_end);
CREATE INDEX IF NOT EXISTS idx_pam_guarantee_evaluations_status ON public.pam_savings_guarantee_evaluations(guarantee_status);

-- =====================================================
-- 6. CREATE ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.pam_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_savings_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_monthly_savings_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_savings_guarantee_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pam_recommendations
CREATE POLICY "Users can view their own recommendations"
    ON public.pam_recommendations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendations"
    ON public.pam_recommendations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
    ON public.pam_recommendations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for pam_savings_events
CREATE POLICY "Users can view their own savings events"
    ON public.pam_savings_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings events"
    ON public.pam_savings_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings events"
    ON public.pam_savings_events FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for pam_monthly_savings_summary
CREATE POLICY "Users can view their own monthly summaries"
    ON public.pam_monthly_savings_summary FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can manage monthly summaries"
    ON public.pam_monthly_savings_summary FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for pam_savings_guarantee_evaluations
CREATE POLICY "Users can view their own guarantee evaluations"
    ON public.pam_savings_guarantee_evaluations FOR SELECT
    USING (auth.uid() = user_id);

-- =====================================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_pam_recommendations_updated_at 
    BEFORE UPDATE ON public.pam_recommendations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pam_savings_events_updated_at 
    BEFORE UPDATE ON public.pam_savings_events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pam_monthly_savings_summary_updated_at 
    BEFORE UPDATE ON public.pam_monthly_savings_summary
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pam_savings_guarantee_evaluations_updated_at 
    BEFORE UPDATE ON public.pam_savings_guarantee_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 8. GRANT APPROPRIATE PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.pam_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pam_savings_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pam_monthly_savings_summary TO authenticated;
GRANT SELECT ON public.pam_savings_guarantee_evaluations TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE public.pam_savings_events_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.pam_monthly_savings_summary_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.pam_savings_guarantee_evaluations_id_seq TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This migration creates a comprehensive database foundation for the PAM Savings Guarantee system
-- Tables support tracking recommendations, savings events, monthly summaries, and guarantee evaluations
-- RLS policies ensure data security, indexes optimize performance, and triggers maintain data integrity