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
