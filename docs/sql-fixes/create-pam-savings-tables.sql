-- PAM Savings Guarantee - Essential Tables Only
-- Simplified version for deployment

CREATE TABLE IF NOT EXISTS public.pam_recommendations (
    id BIGSERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS public.pam_savings_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    recommendation_id BIGINT REFERENCES pam_recommendations(id),
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

CREATE TABLE IF NOT EXISTS public.monthly_savings_summary (
    id BIGSERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS public.savings_guarantee_history (
    id BIGSERIAL PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_date ON pam_savings_events(user_id, saved_date);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_category ON pam_savings_events(category);
CREATE INDEX IF NOT EXISTS idx_monthly_summary_user_period ON monthly_savings_summary(user_id, billing_period_start);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_user ON pam_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_guarantee_history_user ON savings_guarantee_history(user_id, billing_period);

ALTER TABLE public.pam_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_savings_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_savings_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_guarantee_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations" ON pam_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendations" ON pam_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendations" ON pam_recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recommendations" ON pam_recommendations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own savings events" ON pam_savings_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own savings events" ON pam_savings_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own savings events" ON pam_savings_events FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own monthly summary" ON monthly_savings_summary FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own monthly summary" ON monthly_savings_summary FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own monthly summary" ON monthly_savings_summary FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own guarantee history" ON savings_guarantee_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own guarantee history" ON savings_guarantee_history FOR INSERT WITH CHECK (auth.uid() = user_id);