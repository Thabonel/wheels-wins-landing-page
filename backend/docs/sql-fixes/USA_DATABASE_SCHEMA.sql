-- Universal Site Access (USA) Database Schema
-- Analytics and session tracking for browser automation

-- Create USA sessions table for analytics
CREATE TABLE IF NOT EXISTS usa_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    current_url TEXT,
    actions_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed', 'expired')),
    user_agent TEXT,
    viewport_width INTEGER,
    viewport_height INTEGER,
    total_elements_indexed INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_types INTEGER DEFAULT 0,
    total_navigations INTEGER DEFAULT 0,
    total_screenshots INTEGER DEFAULT 0,
    session_duration_seconds INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    last_error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usa_sessions_user ON usa_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_usa_sessions_activity ON usa_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_usa_sessions_status ON usa_sessions(status);
CREATE INDEX IF NOT EXISTS idx_usa_sessions_created ON usa_sessions(created_at);

-- Enable RLS for security
ALTER TABLE usa_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view own USA sessions" ON usa_sessions;
    DROP POLICY IF EXISTS "Users can insert own USA sessions" ON usa_sessions;
    DROP POLICY IF EXISTS "Users can update own USA sessions" ON usa_sessions;
    DROP POLICY IF EXISTS "Service role has full access" ON usa_sessions;
END $$;

-- Users can only view their own sessions
CREATE POLICY "Users can view own USA sessions"
    ON usa_sessions FOR SELECT
    USING (user_id = auth.uid());

-- Users can create sessions for themselves
CREATE POLICY "Users can insert own USA sessions"
    ON usa_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update own USA sessions"
    ON usa_sessions FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Service role has full access for backend operations
CREATE POLICY "Service role has full access"
    ON usa_sessions FOR ALL
    USING (auth.role() = 'service_role');

-- Create function to update last_activity automatically
CREATE OR REPLACE FUNCTION update_usa_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = NOW();

    -- Calculate session duration if session is being closed
    IF NEW.status IN ('closed', 'expired') AND OLD.status = 'active' THEN
        NEW.session_duration_seconds = EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INTEGER;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updates
DROP TRIGGER IF EXISTS trigger_update_usa_session_activity ON usa_sessions;
CREATE TRIGGER trigger_update_usa_session_activity
    BEFORE UPDATE ON usa_sessions
    FOR EACH ROW EXECUTE FUNCTION update_usa_session_activity();

-- Create view for session analytics
CREATE OR REPLACE VIEW usa_session_analytics AS
SELECT
    user_id,
    COUNT(*) as total_sessions,
    AVG(session_duration_seconds) as avg_duration_seconds,
    SUM(actions_count) as total_actions,
    SUM(total_clicks) as total_clicks,
    SUM(total_types) as total_types,
    SUM(total_navigations) as total_navigations,
    SUM(total_screenshots) as total_screenshots,
    SUM(errors_count) as total_errors,
    MAX(last_activity) as last_session,
    COUNT(*) FILTER (WHERE status = 'active') as active_sessions
FROM usa_sessions
GROUP BY user_id;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON usa_sessions TO authenticated;
GRANT SELECT ON usa_session_analytics TO authenticated;
GRANT USAGE ON SEQUENCE usa_sessions_id_seq TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE usa_sessions IS 'Browser automation sessions for Universal Site Access';
COMMENT ON COLUMN usa_sessions.user_id IS 'User who owns this session';
COMMENT ON COLUMN usa_sessions.current_url IS 'Current URL in the browser session';
COMMENT ON COLUMN usa_sessions.actions_count IS 'Total actions performed in this session';
COMMENT ON COLUMN usa_sessions.status IS 'Session status: active, paused, closed, expired';
COMMENT ON COLUMN usa_sessions.metadata IS 'Additional session metadata (JSONB)';
COMMENT ON VIEW usa_session_analytics IS 'Aggregated analytics for USA sessions per user';