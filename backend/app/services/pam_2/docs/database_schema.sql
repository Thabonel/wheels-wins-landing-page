-- PAM 2.0 Database Schema
-- Required tables for PAM 2.0 functionality
-- Execute in order for proper dependency setup

-- =====================================================
-- Phase 3: Context Manager Tables
-- =====================================================

-- Conversation context storage
CREATE TABLE IF NOT EXISTS pam_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]',
    current_topic TEXT,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pam_conversations_user_id ON pam_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_conversations_session_id ON pam_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_pam_conversations_last_activity ON pam_conversations(last_activity);

-- Enable vector similarity search (Phase 3+)
CREATE EXTENSION IF NOT EXISTS vector;

-- Conversation embeddings for semantic search
CREATE TABLE IF NOT EXISTS pam_conversation_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES pam_conversations(id) ON DELETE CASCADE,
    content_text TEXT NOT NULL,
    embedding vector(1536), -- OpenAI/Gemini embedding dimension
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity index
CREATE INDEX IF NOT EXISTS idx_pam_conversation_embeddings_vector
ON pam_conversation_embeddings USING ivfflat (embedding vector_cosine_ops);

-- =====================================================
-- Phase 4: Trip Logger Tables
-- =====================================================

-- Trip activity detection and logging
CREATE TABLE IF NOT EXISTS pam_trip_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    activity_type TEXT NOT NULL,
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    entities JSONB DEFAULT '[]',
    message_content TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pam_trip_activities_user_id ON pam_trip_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_trip_activities_type ON pam_trip_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_pam_trip_activities_detected_at ON pam_trip_activities(detected_at);

-- Trip planning sessions (grouped activities)
CREATE TABLE IF NOT EXISTS pam_trip_planning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_name TEXT,
    destination TEXT,
    start_date DATE,
    end_date DATE,
    budget_amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    planning_stage TEXT DEFAULT 'initial', -- initial, budgeting, booking, finalized
    activities_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link activities to planning sessions
ALTER TABLE pam_trip_activities
ADD COLUMN IF NOT EXISTS planning_session_id UUID REFERENCES pam_trip_planning_sessions(id);

-- =====================================================
-- Phase 5: Savings Tracker Tables
-- =====================================================

-- Financial analysis and recommendations
CREATE TABLE IF NOT EXISTS pam_financial_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL, -- budgeting, savings_goal, expense_tracking, etc.
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    detected_amounts JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    message_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pam_financial_analyses_user_id ON pam_financial_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_financial_analyses_type ON pam_financial_analyses(analysis_type);

-- Savings goals and tracking
CREATE TABLE IF NOT EXISTS pam_savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_name TEXT NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0,
    target_date DATE,
    category TEXT DEFAULT 'general', -- travel, emergency, general, etc.
    status TEXT DEFAULT 'active', -- active, completed, paused
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Phase 7: Safety Layer Tables
-- =====================================================

-- Safety levels enum
CREATE TYPE IF NOT EXISTS safety_level AS ENUM ('low', 'medium', 'high');

-- User guardrails configuration
CREATE TABLE IF NOT EXISTS pam_guardrails_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    safety_level safety_level DEFAULT 'medium',
    rate_limit_messages_per_hour INTEGER DEFAULT 100,
    content_filtering_enabled BOOLEAN DEFAULT true,
    user_safety_monitoring BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure one config per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_pam_guardrails_config_user_id ON pam_guardrails_config(user_id);

-- Safety incidents logging
CREATE TABLE IF NOT EXISTS pam_safety_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    incident_type TEXT NOT NULL, -- rate_limit, content_violation, suspicious_activity
    severity TEXT DEFAULT 'low', -- low, medium, high, critical
    details JSONB NOT NULL,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pam_safety_incidents_user_id ON pam_safety_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_safety_incidents_type ON pam_safety_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_pam_safety_incidents_severity ON pam_safety_incidents(severity);

-- Rate limiting tracking (Redis backup)
CREATE TABLE IF NOT EXISTS pam_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    time_window TIMESTAMPTZ NOT NULL,
    request_count INTEGER DEFAULT 1,
    last_request_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint for time windows
CREATE UNIQUE INDEX IF NOT EXISTS idx_pam_rate_limits_user_window
ON pam_rate_limits(user_id, date_trunc('hour', time_window));

-- =====================================================
-- RLS Policies (Row Level Security)
-- =====================================================

-- Enable RLS on all PAM tables
ALTER TABLE pam_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_conversation_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_trip_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_trip_planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_financial_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_guardrails_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policies for user data access
CREATE POLICY IF NOT EXISTS "Users can access their own conversations"
ON pam_conversations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can access their own trip activities"
ON pam_trip_activities FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can access their own trip planning sessions"
ON pam_trip_planning_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can access their own financial analyses"
ON pam_financial_analyses FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can access their own savings goals"
ON pam_savings_goals FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can access their own guardrails config"
ON pam_guardrails_config FOR ALL USING (auth.uid() = user_id);

-- Admin access for safety incidents (for monitoring)
CREATE POLICY IF NOT EXISTS "Service role can access safety incidents"
ON pam_safety_incidents FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role can access rate limits"
ON pam_rate_limits FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Triggers and Functions
-- =====================================================

-- Update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
CREATE TRIGGER update_pam_conversations_updated_at
    BEFORE UPDATE ON pam_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pam_trip_planning_sessions_updated_at
    BEFORE UPDATE ON pam_trip_planning_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pam_savings_goals_updated_at
    BEFORE UPDATE ON pam_savings_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pam_guardrails_config_updated_at
    BEFORE UPDATE ON pam_guardrails_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Initial Data
-- =====================================================

-- Insert default guardrails config for existing users
INSERT INTO pam_guardrails_config (user_id, safety_level, rate_limit_messages_per_hour)
SELECT id, 'medium', 100
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM pam_guardrails_config)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- Views for Analytics
-- =====================================================

-- User activity summary view
CREATE OR REPLACE VIEW pam_user_activity_summary AS
SELECT
    u.id as user_id,
    u.email,
    COUNT(DISTINCT pc.session_id) as conversation_sessions,
    COUNT(pta.id) as trip_activities,
    COUNT(pfa.id) as financial_analyses,
    COUNT(psg.id) as savings_goals,
    MAX(pc.last_activity) as last_pam_activity
FROM auth.users u
LEFT JOIN pam_conversations pc ON u.id = pc.user_id
LEFT JOIN pam_trip_activities pta ON u.id = pta.user_id
LEFT JOIN pam_financial_analyses pfa ON u.id = pfa.user_id
LEFT JOIN pam_savings_goals psg ON u.id = psg.user_id
GROUP BY u.id, u.email;

-- Trip planning insights view
CREATE OR REPLACE VIEW pam_trip_planning_insights AS
SELECT
    user_id,
    COUNT(*) as total_sessions,
    COUNT(DISTINCT destination) as unique_destinations,
    AVG(budget_amount) as avg_budget,
    string_agg(DISTINCT destination, ', ') as destinations_explored
FROM pam_trip_planning_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id;

-- Safety monitoring view
CREATE OR REPLACE VIEW pam_safety_monitoring AS
SELECT
    user_id,
    COUNT(*) as total_incidents,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_incidents,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_incidents,
    MAX(created_at) as last_incident
FROM pam_safety_incidents
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id
HAVING COUNT(*) > 0;

-- Performance analytics view
CREATE OR REPLACE VIEW pam_performance_metrics AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_conversations,
    COUNT(DISTINCT user_id) as active_users,
    AVG(array_length(messages::json, 1)) as avg_messages_per_conversation
FROM pam_conversations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;