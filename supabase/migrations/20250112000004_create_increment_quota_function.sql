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
