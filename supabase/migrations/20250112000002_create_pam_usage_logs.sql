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
