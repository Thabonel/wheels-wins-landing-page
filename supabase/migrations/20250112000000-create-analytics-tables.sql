CREATE TABLE IF NOT EXISTS public.pam_analytics_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    event_data JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pam_analytics_logs_user_id ON public.pam_analytics_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_logs_timestamp ON public.pam_analytics_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_logs_event_type ON public.pam_analytics_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_logs_session_id ON public.pam_analytics_logs(session_id);

CREATE TABLE IF NOT EXISTS public.analytics_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period TEXT NOT NULL CHECK (period IN ('hourly', 'daily')),
    data JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_summary_period ON public.analytics_summary(period);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_timestamp ON public.analytics_summary(timestamp DESC);

CREATE TABLE IF NOT EXISTS public.analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_interactions INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    avg_response_time DECIMAL(10,2),
    error_rate DECIMAL(5,2),
    popular_features JSONB,
    user_engagement JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON public.analytics_daily(date DESC);

ALTER TABLE public.pam_analytics_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analytics logs"
    ON public.pam_analytics_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert analytics logs"
    ON public.pam_analytics_logs
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can manage analytics summary"
    ON public.analytics_summary
    FOR ALL
    USING (true);

CREATE POLICY "Service role can manage analytics daily"
    ON public.analytics_daily
    FOR ALL
    USING (true);

CREATE POLICY "Authenticated users can view analytics summary"
    ON public.analytics_summary
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view analytics daily"
    ON public.analytics_daily
    FOR SELECT
    USING (auth.role() = 'authenticated');
