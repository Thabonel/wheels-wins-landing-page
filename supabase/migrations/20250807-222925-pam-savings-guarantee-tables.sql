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
        'fuel_optimization', 'camping_alternative', 'route_optimization',
        'budget_reallocation', 'price_comparison', 'timing_optimization',
        'maintenance_prevention', 'group_booking_discount'
    )),
    predicted_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    actual_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    baseline_cost DECIMAL(10,2) NOT NULL CHECK (baseline_cost >= 0),
    optimized_cost DECIMAL(10,2) NOT NULL CHECK (optimized_cost >= 0),
    savings_description TEXT NOT NULL,
    verification_method TEXT NOT NULL CHECK (verification_method IN (
        'expense_comparison', 'receipt_analysis', 'user_confirmation', 
        'automatic_detection', 'price_api_verification'
    )),
    confidence_score DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_score BETWEEN 0 AND 1),
    location GEOGRAPHY(POINT, 4326),
    category TEXT NOT NULL, -- expense category where savings occurred
    saved_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT positive_baseline CHECK (baseline_cost >= 0),
    CONSTRAINT positive_optimized CHECK (optimized_cost >= 0),
    CONSTRAINT savings_calculation CHECK (actual_savings = baseline_cost - optimized_cost)
);

-- =====================================================
-- 3. CREATE MONTHLY SAVINGS SUMMARY TABLE
-- =====================================================

-- Table for aggregating monthly savings for guarantee evaluation
CREATE TABLE IF NOT EXISTS public.monthly_savings_summary (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    subscription_cost DECIMAL(10,2) NOT NULL CHECK (subscription_cost >= 0),
    total_predicted_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_actual_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    savings_events_count INTEGER NOT NULL DEFAULT 0,
    guarantee_met BOOLEAN NOT NULL DEFAULT FALSE,
    guarantee_amount DECIMAL(10,2) DEFAULT 0 CHECK (guarantee_amount >= 0),
    evaluation_date TIMESTAMPTZ,
    processed_date TIMESTAMPTZ,
    stripe_refund_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, billing_period_start),
    CONSTRAINT valid_billing_period CHECK (billing_period_end > billing_period_start)
);

-- =====================================================
-- 4. CREATE SAVINGS GUARANTEE HISTORY TABLE
-- =====================================================

-- Table for audit trail of guarantee processing
CREATE TABLE IF NOT EXISTS public.savings_guarantee_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_summary_id BIGINT REFERENCES public.monthly_savings_summary(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'guarantee_evaluation', 'refund_processed', 'credit_applied',
        'manual_adjustment', 'dispute_resolution'
    )),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    stripe_transaction_id TEXT,
    admin_notes TEXT,
    processed_by UUID, -- Admin user who processed manual actions
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. CREATE PERFORMANCE INDEXES
-- =====================================================

-- Indexes for pam_recommendations
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_user_id ON public.pam_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_category ON public.pam_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_priority ON public.pam_recommendations(priority_level);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_created_at ON public.pam_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_expires_at ON public.pam_recommendations(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_user_acted ON public.pam_recommendations(user_acted) WHERE user_acted = TRUE;
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_savings ON public.pam_recommendations(predicted_savings DESC) WHERE predicted_savings > 0;

-- Indexes for pam_savings_events
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_id ON public.pam_savings_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_date ON public.pam_savings_events(user_id, saved_date);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_type ON public.pam_savings_events(savings_type, saved_date);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_recommendation ON public.pam_savings_events(recommendation_id) WHERE recommendation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_category ON public.pam_savings_events(category, saved_date);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_created_at ON public.pam_savings_events(created_at DESC);

-- Indexes for monthly_savings_summary
CREATE INDEX IF NOT EXISTS idx_monthly_savings_user_period ON public.monthly_savings_summary(user_id, billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_monthly_savings_guarantee ON public.monthly_savings_summary(guarantee_met, billing_period_start);
CREATE INDEX IF NOT EXISTS idx_monthly_savings_evaluation ON public.monthly_savings_summary(evaluation_date) WHERE evaluation_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_monthly_savings_processed ON public.monthly_savings_summary(processed_date) WHERE processed_date IS NOT NULL;

-- Indexes for savings_guarantee_history
CREATE INDEX IF NOT EXISTS idx_savings_guarantee_user_id ON public.savings_guarantee_history(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_guarantee_status ON public.savings_guarantee_history(status, created_at);
CREATE INDEX IF NOT EXISTS idx_savings_guarantee_action ON public.savings_guarantee_history(action_type, created_at);
CREATE INDEX IF NOT EXISTS idx_savings_guarantee_monthly_summary ON public.savings_guarantee_history(monthly_summary_id);

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.pam_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_savings_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_savings_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_guarantee_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE RLS POLICIES
-- =====================================================

-- Policies for pam_recommendations
CREATE POLICY "Users access own recommendations" ON public.pam_recommendations
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access recommendations" ON public.pam_recommendations
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for pam_savings_events
CREATE POLICY "Users access own savings events" ON public.pam_savings_events
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access savings events" ON public.pam_savings_events
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for monthly_savings_summary
CREATE POLICY "Users access own monthly summaries" ON public.monthly_savings_summary
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access monthly summaries" ON public.monthly_savings_summary
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for savings_guarantee_history
CREATE POLICY "Users view own guarantee history" ON public.savings_guarantee_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access guarantee history" ON public.savings_guarantee_history
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 8. CREATE UTILITY FUNCTIONS
-- =====================================================

-- Function to calculate user's baseline spending pattern
CREATE OR REPLACE FUNCTION calculate_baseline_spending(
    p_user_id UUID,
    p_category TEXT,
    p_location GEOGRAPHY DEFAULT NULL,
    p_lookback_days INTEGER DEFAULT 90
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    baseline_amount DECIMAL(10,2) DEFAULT 0;
BEGIN
    SELECT AVG(amount) INTO baseline_amount
    FROM public.expenses
    WHERE user_id = p_user_id
        AND category = p_category
        AND created_at >= NOW() - INTERVAL '1 day' * p_lookback_days
        AND (p_location IS NULL OR ST_DWithin(location, p_location, 50000)); -- 50km radius
    
    RETURN COALESCE(baseline_amount, 0);
END;
$$;

-- Function to aggregate monthly savings
CREATE OR REPLACE FUNCTION update_monthly_savings_summary(p_user_id UUID, p_billing_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    period_start DATE;
    period_end DATE;
    subscription_amount DECIMAL(10,2);
    total_actual DECIMAL(10,2) DEFAULT 0;
    total_predicted DECIMAL(10,2) DEFAULT 0;
    events_count INTEGER DEFAULT 0;
    guarantee_met BOOLEAN DEFAULT FALSE;
BEGIN
    -- Calculate billing period
    period_start := p_billing_date;
    period_end := p_billing_date + INTERVAL '1 month';
    
    -- Get user's subscription cost (default to $29.99 monthly)
    SELECT 
        CASE 
            WHEN us.plan_type = 'monthly' THEN 29.99
            WHEN us.plan_type = 'annual' THEN 299.99/12
            ELSE 29.99
        END INTO subscription_amount
    FROM public.user_subscriptions us
    WHERE us.user_id = p_user_id AND us.subscription_status = 'active'
    LIMIT 1;
    
    -- Default subscription amount if no record found
    subscription_amount := COALESCE(subscription_amount, 29.99);
    
    -- Aggregate savings for the period
    SELECT 
        COALESCE(SUM(actual_savings), 0),
        COALESCE(SUM(predicted_savings), 0),
        COUNT(*)
    INTO total_actual, total_predicted, events_count
    FROM public.pam_savings_events
    WHERE user_id = p_user_id
        AND saved_date >= period_start
        AND saved_date < period_end;
    
    -- Determine if guarantee is met
    guarantee_met := total_actual >= subscription_amount;
    
    -- Insert or update monthly summary
    INSERT INTO public.monthly_savings_summary (
        user_id, billing_period_start, billing_period_end, subscription_cost,
        total_actual_savings, total_predicted_savings, savings_events_count,
        guarantee_met, guarantee_amount, evaluation_date
    ) VALUES (
        p_user_id, period_start, period_end, subscription_amount,
        total_actual, total_predicted, events_count,
        guarantee_met, 
        CASE WHEN NOT guarantee_met THEN subscription_amount ELSE 0 END,
        NOW()
    )
    ON CONFLICT (user_id, billing_period_start)
    DO UPDATE SET
        total_actual_savings = EXCLUDED.total_actual_savings,
        total_predicted_savings = EXCLUDED.total_predicted_savings,
        savings_events_count = EXCLUDED.savings_events_count,
        guarantee_met = EXCLUDED.guarantee_met,
        guarantee_amount = EXCLUDED.guarantee_amount,
        evaluation_date = EXCLUDED.evaluation_date,
        updated_at = NOW();
END;
$$;

-- Function to get savings guarantee status
CREATE OR REPLACE FUNCTION get_savings_guarantee_status(p_user_id UUID, p_billing_date DATE)
RETURNS TABLE(
    guarantee_met BOOLEAN,
    total_savings DECIMAL(10,2),
    subscription_cost DECIMAL(10,2),
    savings_shortfall DECIMAL(10,2),
    savings_events_count INTEGER,
    billing_period_start DATE,
    billing_period_end DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update monthly summary first
    PERFORM update_monthly_savings_summary(p_user_id, p_billing_date);
    
    -- Return guarantee status
    RETURN QUERY
    SELECT 
        mss.guarantee_met,
        mss.total_actual_savings,
        mss.subscription_cost,
        CASE 
            WHEN mss.guarantee_met THEN 0::DECIMAL(10,2)
            ELSE mss.subscription_cost - mss.total_actual_savings
        END as savings_shortfall,
        mss.savings_events_count,
        mss.billing_period_start,
        mss.billing_period_end
    FROM public.monthly_savings_summary mss
    WHERE mss.user_id = p_user_id 
        AND mss.billing_period_start = p_billing_date;
END;
$$;

-- =====================================================
-- 9. CREATE TRIGGERS
-- =====================================================

-- Updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pam_recommendations_updated_at
    BEFORE UPDATE ON public.pam_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pam_savings_events_updated_at
    BEFORE UPDATE ON public.pam_savings_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_savings_summary_updated_at
    BEFORE UPDATE ON public.monthly_savings_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_savings_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.monthly_savings_summary TO authenticated;
GRANT SELECT ON public.savings_guarantee_history TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON SEQUENCE public.pam_savings_events_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.monthly_savings_summary_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.savings_guarantee_history_id_seq TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION calculate_baseline_spending(UUID, TEXT, GEOGRAPHY, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_monthly_savings_summary(UUID, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_savings_guarantee_status(UUID, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO service_role;

-- =====================================================
-- 11. MIGRATION COMPLETION LOG
-- =====================================================

-- Log the completion of this migration
DO $$
BEGIN
    RAISE NOTICE '=== PAM Savings Guarantee Migration Completed Successfully ===';
    RAISE NOTICE 'Created Tables:';
    RAISE NOTICE '  ✅ pam_recommendations - PAM recommendations with savings prediction';
    RAISE NOTICE '  ✅ pam_savings_events - Track individual savings instances';
    RAISE NOTICE '  ✅ monthly_savings_summary - Aggregate monthly totals for guarantee evaluation';
    RAISE NOTICE '  ✅ savings_guarantee_history - Audit trail for guarantee processing';
    RAISE NOTICE '';
    RAISE NOTICE 'Added Features:';
    RAISE NOTICE '  ✅ Performance indexes for all tables';
    RAISE NOTICE '  ✅ RLS policies for data security';
    RAISE NOTICE '  ✅ Utility functions for baseline calculations and guarantee evaluation';
    RAISE NOTICE '  ✅ Triggers for automatic timestamp updates';
    RAISE NOTICE '  ✅ Comprehensive data validation constraints';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 PAM Savings Guarantee Database Foundation is COMPLETE!';
    RAISE NOTICE 'Ready for backend API integration and frontend implementation.';
END $$;