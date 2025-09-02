-- PAM Continuous Learning Database Schema
-- Creates tables for storing learning data, patterns, and user preferences

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Learning data points table
CREATE TABLE IF NOT EXISTS pam_learning_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    interaction_type TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    user_input TEXT NOT NULL,
    pam_response TEXT NOT NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN (
        'explicit_positive', 'explicit_negative', 'implicit_engagement',
        'implicit_abandonment', 'correction'
    )),
    feedback_score DECIMAL(3,2) NOT NULL CHECK (feedback_score >= 0 AND feedback_score <= 1),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for efficient querying
    INDEX idx_pam_learning_data_user_id (user_id),
    INDEX idx_pam_learning_data_timestamp (timestamp),
    INDEX idx_pam_learning_data_feedback_type (feedback_type),
    INDEX idx_pam_learning_data_feedback_score (feedback_score),
    INDEX gin_pam_learning_data_context (context),
    INDEX gin_pam_learning_data_metadata (metadata)
);

-- Conversational patterns table
CREATE TABLE IF NOT EXISTS pam_conversational_patterns (
    pattern_id TEXT PRIMARY KEY,
    pattern_type TEXT NOT NULL,
    trigger_phrases JSONB NOT NULL DEFAULT '[]',
    expected_responses JSONB NOT NULL DEFAULT '[]',
    success_rate DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (success_rate >= 0 AND success_rate <= 1),
    usage_frequency INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_pam_patterns_type (pattern_type),
    INDEX idx_pam_patterns_success_rate (success_rate),
    INDEX idx_pam_patterns_usage_frequency (usage_frequency),
    INDEX gin_pam_patterns_triggers (trigger_phrases),
    INDEX gin_pam_patterns_responses (expected_responses)
);

-- User preferences table
CREATE TABLE IF NOT EXISTS pam_user_preferences (
    user_id TEXT PRIMARY KEY,
    communication_style TEXT NOT NULL DEFAULT 'neutral' CHECK (communication_style IN (
        'formal', 'casual', 'neutral'
    )),
    preferred_response_length TEXT NOT NULL DEFAULT 'moderate' CHECK (preferred_response_length IN (
        'brief', 'moderate', 'detailed'
    )),
    topic_interests JSONB NOT NULL DEFAULT '{}',
    interaction_patterns JSONB NOT NULL DEFAULT '{}',
    learning_preferences JSONB NOT NULL DEFAULT '{}',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_pam_user_prefs_style (communication_style),
    INDEX idx_pam_user_prefs_length (preferred_response_length),
    INDEX gin_pam_user_prefs_topics (topic_interests),
    INDEX gin_pam_user_prefs_patterns (interaction_patterns)
);

-- Knowledge corrections table for tracking improvements
CREATE TABLE IF NOT EXISTS pam_knowledge_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    original_input TEXT NOT NULL,
    original_response TEXT NOT NULL,
    corrected_response TEXT NOT NULL,
    correction_type TEXT NOT NULL DEFAULT 'user_provided',
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN (
        'pending', 'validated', 'rejected', 'incorporated'
    )),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    
    -- Indexes
    INDEX idx_pam_corrections_user_id (user_id),
    INDEX idx_pam_corrections_type (correction_type),
    INDEX idx_pam_corrections_status (validation_status),
    INDEX idx_pam_corrections_confidence (confidence_score)
);

-- Learning analytics aggregation table
CREATE TABLE IF NOT EXISTS pam_learning_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    metric_metadata JSONB NOT NULL DEFAULT '{}',
    time_period TEXT NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint for metric per time period
    UNIQUE(metric_name, time_period, period_start),
    
    -- Indexes
    INDEX idx_pam_analytics_metric (metric_name),
    INDEX idx_pam_analytics_period (time_period),
    INDEX idx_pam_analytics_time_range (period_start, period_end)
);

-- User learning progress tracking
CREATE TABLE IF NOT EXISTS pam_user_learning_progress (
    user_id TEXT NOT NULL,
    learning_dimension TEXT NOT NULL, -- 'preferences', 'patterns', 'corrections'
    progress_score DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (progress_score >= 0 AND progress_score <= 1),
    confidence_level DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (confidence_level >= 0 AND confidence_level <= 1),
    last_interaction TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_interactions INTEGER NOT NULL DEFAULT 0,
    successful_interactions INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (user_id, learning_dimension),
    
    -- Indexes
    INDEX idx_pam_user_progress_score (progress_score),
    INDEX idx_pam_user_progress_confidence (confidence_level),
    INDEX idx_pam_user_progress_interactions (total_interactions)
);

-- Response effectiveness tracking
CREATE TABLE IF NOT EXISTS pam_response_effectiveness (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_pattern_hash TEXT NOT NULL, -- Hash of response pattern for grouping
    user_context_hash TEXT NOT NULL, -- Hash of user context
    effectiveness_score DECIMAL(3,2) NOT NULL CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),
    sample_size INTEGER NOT NULL DEFAULT 1,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}',
    
    UNIQUE(response_pattern_hash, user_context_hash),
    
    -- Indexes
    INDEX idx_pam_effectiveness_pattern (response_pattern_hash),
    INDEX idx_pam_effectiveness_context (user_context_hash),
    INDEX idx_pam_effectiveness_score (effectiveness_score)
);

-- RLS Policies for security

-- Enable RLS on all learning tables
ALTER TABLE pam_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_conversational_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_knowledge_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_user_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_response_effectiveness ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Users can access their own learning data"
ON pam_learning_data FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own preferences"
ON pam_user_preferences FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own corrections"
ON pam_knowledge_corrections FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own progress"
ON pam_user_learning_progress FOR ALL
USING (auth.uid()::text = user_id);

-- Service role policies for system operations
CREATE POLICY "Service role full access to conversational patterns"
ON pam_conversational_patterns FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to learning analytics"
ON pam_learning_analytics FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to response effectiveness"
ON pam_response_effectiveness FOR ALL
USING (auth.role() = 'service_role');

-- Functions for learning analytics

-- Function to calculate user learning progress
CREATE OR REPLACE FUNCTION calculate_user_learning_progress(
    p_user_id TEXT,
    p_dimension TEXT
) RETURNS JSONB AS $$
DECLARE
    total_interactions INTEGER := 0;
    successful_interactions INTEGER := 0;
    progress_score DECIMAL(3,2) := 0;
    confidence_level DECIMAL(3,2) := 0;
BEGIN
    -- Get interaction counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE feedback_score > 0.7)
    INTO total_interactions, successful_interactions
    FROM pam_learning_data
    WHERE user_id = p_user_id
        AND timestamp > NOW() - INTERVAL '30 days';
    
    -- Calculate progress score
    IF total_interactions > 0 THEN
        progress_score := LEAST(1.0, successful_interactions::DECIMAL / total_interactions::DECIMAL);
    END IF;
    
    -- Calculate confidence level (based on sample size)
    confidence_level := LEAST(1.0, total_interactions::DECIMAL / 100.0);
    
    -- Update progress table
    INSERT INTO pam_user_learning_progress (
        user_id, learning_dimension, progress_score, confidence_level,
        total_interactions, successful_interactions
    ) VALUES (
        p_user_id, p_dimension, progress_score, confidence_level,
        total_interactions, successful_interactions
    ) ON CONFLICT (user_id, learning_dimension) DO UPDATE SET
        progress_score = EXCLUDED.progress_score,
        confidence_level = EXCLUDED.confidence_level,
        total_interactions = EXCLUDED.total_interactions,
        successful_interactions = EXCLUDED.successful_interactions,
        updated_at = NOW();
    
    RETURN jsonb_build_object(
        'progress_score', progress_score,
        'confidence_level', confidence_level,
        'total_interactions', total_interactions,
        'successful_interactions', successful_interactions
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get learning insights
CREATE OR REPLACE FUNCTION get_learning_insights(
    p_user_id TEXT DEFAULT NULL,
    p_days_back INTEGER DEFAULT 7
) RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}'::JSONB;
    avg_feedback DECIMAL(3,2);
    interaction_count INTEGER;
    improvement_trend DECIMAL(3,2);
BEGIN
    -- Calculate average feedback score
    SELECT 
        AVG(feedback_score),
        COUNT(*)
    INTO avg_feedback, interaction_count
    FROM pam_learning_data
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND timestamp > NOW() - (p_days_back || ' days')::INTERVAL;
    
    -- Calculate improvement trend (compare recent vs older interactions)
    WITH recent_avg AS (
        SELECT AVG(feedback_score) as recent_score
        FROM pam_learning_data
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND timestamp > NOW() - (p_days_back / 2 || ' days')::INTERVAL
    ),
    older_avg AS (
        SELECT AVG(feedback_score) as older_score
        FROM pam_learning_data
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
            AND timestamp BETWEEN 
                NOW() - (p_days_back || ' days')::INTERVAL AND 
                NOW() - (p_days_back / 2 || ' days')::INTERVAL
    )
    SELECT COALESCE(recent_avg.recent_score - older_avg.older_score, 0)
    INTO improvement_trend
    FROM recent_avg, older_avg;
    
    -- Build result
    result := jsonb_build_object(
        'average_feedback', COALESCE(avg_feedback, 0),
        'interaction_count', COALESCE(interaction_count, 0),
        'improvement_trend', COALESCE(improvement_trend, 0),
        'analysis_period_days', p_days_back,
        'generated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old learning data
CREATE OR REPLACE FUNCTION cleanup_old_learning_data(
    retention_days INTEGER DEFAULT 365
) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete old learning data (keep aggregated analytics)
    DELETE FROM pam_learning_data 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup operation
    INSERT INTO pam_learning_analytics (
        metric_name, metric_value, metric_metadata, time_period, 
        period_start, period_end
    ) VALUES (
        'cleanup_deleted_records', deleted_count, 
        jsonb_build_object('retention_days', retention_days),
        'cleanup', NOW() - INTERVAL '1 minute', NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_learning_data_composite
ON pam_learning_data (user_id, timestamp DESC, feedback_score);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_learning_data_recent
ON pam_learning_data (timestamp DESC) 
WHERE timestamp > NOW() - INTERVAL '30 days';

-- Insert initial learning analytics
INSERT INTO pam_learning_analytics (
    metric_name, metric_value, metric_metadata, time_period,
    period_start, period_end
) VALUES 
    ('system_initialized', 1.0, 
     jsonb_build_object('version', '1.0', 'features', jsonb_build_array('continuous_learning', 'pattern_recognition', 'user_preferences')),
     'system', NOW(), NOW()),
    ('learning_tables_created', 7.0,
     jsonb_build_object('tables', jsonb_build_array('pam_learning_data', 'pam_conversational_patterns', 'pam_user_preferences', 'pam_knowledge_corrections', 'pam_learning_analytics', 'pam_user_learning_progress', 'pam_response_effectiveness')),
     'system', NOW(), NOW());

COMMENT ON TABLE pam_learning_data IS 'Stores individual learning interactions with feedback scores';
COMMENT ON TABLE pam_conversational_patterns IS 'Discovered and validated conversational patterns';
COMMENT ON TABLE pam_user_preferences IS 'Learned user communication preferences and interests';
COMMENT ON TABLE pam_knowledge_corrections IS 'User corrections for continuous knowledge improvement';
COMMENT ON TABLE pam_learning_analytics IS 'Aggregated analytics and metrics for learning system';
COMMENT ON TABLE pam_user_learning_progress IS 'Individual user learning progress tracking';
COMMENT ON TABLE pam_response_effectiveness IS 'Response pattern effectiveness measurements';