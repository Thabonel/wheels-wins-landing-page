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

ALTER TABLE public.savings_guarantee_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own guarantee history" ON savings_guarantee_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own guarantee history" ON savings_guarantee_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_savings_guarantee_history_user ON savings_guarantee_history(user_id, billing_period);