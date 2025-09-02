-- PAM Phase 6: Advanced Intelligence & Learning Database Schema
-- Creates comprehensive database schema for all Phase 6 AI capabilities

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Knowledge Graph Tables

-- Knowledge entities table
CREATE TABLE IF NOT EXISTS pam_knowledge_entities (
    entity_id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'person', 'place', 'concept', 'event', 'organization', 
        'object', 'skill', 'goal', 'preference', 'memory', 'topic', 'relationship'
    )),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    properties JSONB NOT NULL DEFAULT '{}',
    embedding vector(1536), -- OpenAI embedding dimension
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'system',
    user_id TEXT,
    
    -- Indexes
    INDEX idx_kg_entities_type (entity_type),
    INDEX idx_kg_entities_name (name),
    INDEX idx_kg_entities_user (user_id),
    INDEX idx_kg_entities_confidence (confidence),
    INDEX gin_kg_entities_properties (properties),
    INDEX idx_kg_entities_embedding (embedding) USING hnsw (embedding vector_cosine_ops)
);

-- Knowledge relationships table
CREATE TABLE IF NOT EXISTS pam_knowledge_relationships (
    relationship_id TEXT PRIMARY KEY,
    source_entity_id TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    relation_type TEXT NOT NULL CHECK (relation_type IN (
        'is_a', 'part_of', 'contains', 'relates_to', 'similar_to', 'opposite_to',
        'before', 'after', 'during', 'causes', 'enables', 'prevents',
        'knows', 'works_with', 'friend_of', 'uses', 'creates', 'modifies',
        'likes', 'dislikes', 'interested_in'
    )),
    properties JSONB NOT NULL DEFAULT '{}',
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    weight DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (weight >= 0 AND weight <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'system',
    evidence JSONB NOT NULL DEFAULT '[]',
    
    FOREIGN KEY (source_entity_id) REFERENCES pam_knowledge_entities(entity_id) ON DELETE CASCADE,
    FOREIGN KEY (target_entity_id) REFERENCES pam_knowledge_entities(entity_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_kg_rels_source (source_entity_id),
    INDEX idx_kg_rels_target (target_entity_id),
    INDEX idx_kg_rels_type (relation_type),
    INDEX idx_kg_rels_confidence (confidence),
    INDEX gin_kg_rels_properties (properties),
    INDEX gin_kg_rels_evidence (evidence)
);

-- Advanced Reasoning Tables

-- Reasoning chains table
CREATE TABLE IF NOT EXISTS pam_reasoning_chains (
    chain_id TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    reasoning_steps JSONB NOT NULL DEFAULT '[]',
    final_conclusion TEXT NOT NULL,
    overall_confidence DECIMAL(3,2) NOT NULL CHECK (overall_confidence >= 0 AND overall_confidence <= 1),
    reasoning_path JSONB NOT NULL DEFAULT '[]',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    user_id TEXT,
    
    -- Indexes
    INDEX idx_reasoning_chains_user (user_id),
    INDEX idx_reasoning_chains_confidence (overall_confidence),
    INDEX idx_reasoning_chains_time (start_time, end_time),
    INDEX gin_reasoning_chains_steps (reasoning_steps),
    INDEX gin_reasoning_chains_metadata (metadata)
);

-- Decision analyses table
CREATE TABLE IF NOT EXISTS pam_decision_analyses (
    analysis_id TEXT PRIMARY KEY,
    problem_statement TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    recommended_option TEXT,
    reasoning_chain_id TEXT,
    risk_assessment JSONB NOT NULL DEFAULT '{}',
    implementation_plan JSONB NOT NULL DEFAULT '[]',
    success_metrics JSONB NOT NULL DEFAULT '[]',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT,
    
    FOREIGN KEY (reasoning_chain_id) REFERENCES pam_reasoning_chains(chain_id),
    
    -- Indexes
    INDEX idx_decision_analyses_user (user_id),
    INDEX idx_decision_analyses_timestamp (timestamp),
    INDEX gin_decision_analyses_options (options),
    INDEX gin_decision_analyses_risk (risk_assessment)
);

-- Emotional Intelligence Tables

-- Emotional states table
CREATE TABLE IF NOT EXISTS pam_emotional_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    primary_emotion TEXT NOT NULL CHECK (primary_emotion IN (
        'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'trust', 'anticipation',
        'anxiety', 'frustration', 'excitement', 'contentment', 'disappointment', 'gratitude',
        'guilt', 'pride', 'shame', 'hope', 'loneliness', 'confidence', 'embarrassment'
    )),
    intensity DECIMAL(3,2) NOT NULL CHECK (intensity >= 0 AND intensity <= 1),
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    secondary_emotions JSONB NOT NULL DEFAULT '[]',
    emotional_indicators JSONB NOT NULL DEFAULT '[]',
    context_factors JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_emotional_states_user (user_id),
    INDEX idx_emotional_states_emotion (primary_emotion),
    INDEX idx_emotional_states_intensity (intensity),
    INDEX idx_emotional_states_timestamp (timestamp),
    INDEX gin_emotional_states_secondary (secondary_emotions),
    INDEX gin_emotional_states_context (context_factors)
);

-- Empathic responses table
CREATE TABLE IF NOT EXISTS pam_empathic_responses (
    response_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    emotional_acknowledgment TEXT NOT NULL,
    empathic_statement TEXT NOT NULL,
    supportive_action TEXT,
    emotional_validation TEXT NOT NULL,
    empathy_level TEXT NOT NULL CHECK (empathy_level IN (
        'acknowledgment', 'understanding', 'validation', 'support', 'deep_empathy'
    )),
    response_strategy TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    metadata JSONB NOT NULL DEFAULT '{}',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_empathic_responses_user (user_id),
    INDEX idx_empathic_responses_level (empathy_level),
    INDEX idx_empathic_responses_strategy (response_strategy),
    INDEX idx_empathic_responses_confidence (confidence),
    INDEX gin_empathic_responses_metadata (metadata)
);

-- Multi-Modal Processing Tables

-- Multi-modal processing results table
CREATE TABLE IF NOT EXISTS pam_multimodal_processing (
    result_id TEXT PRIMARY KEY,
    input_id TEXT NOT NULL,
    task_type TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    results JSONB NOT NULL DEFAULT '{}',
    processing_time DECIMAL(8,3) NOT NULL DEFAULT 0,
    model_used TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT,
    
    -- Indexes
    INDEX idx_multimodal_processing_user (user_id),
    INDEX idx_multimodal_processing_task (task_type),
    INDEX idx_multimodal_processing_confidence (confidence),
    INDEX idx_multimodal_processing_time (processing_time),
    INDEX gin_multimodal_processing_results (results),
    INDEX gin_multimodal_processing_metadata (metadata)
);

-- Cross-modal alignments table
CREATE TABLE IF NOT EXISTS pam_crossmodal_alignments (
    alignment_id TEXT PRIMARY KEY,
    modalities JSONB NOT NULL DEFAULT '[]',
    alignment_score DECIMAL(3,2) NOT NULL CHECK (alignment_score >= 0 AND alignment_score <= 1),
    aligned_content JSONB NOT NULL DEFAULT '{}',
    temporal_sync JSONB,
    semantic_mapping JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT,
    
    -- Indexes
    INDEX idx_crossmodal_alignments_user (user_id),
    INDEX idx_crossmodal_alignments_score (alignment_score),
    INDEX gin_crossmodal_alignments_modalities (modalities),
    INDEX gin_crossmodal_alignments_content (aligned_content)
);

-- Advanced Personalization Tables

-- Personalized responses table
CREATE TABLE IF NOT EXISTS pam_personalized_responses (
    response_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    original_response TEXT NOT NULL,
    personalized_response TEXT NOT NULL,
    personalization_applied JSONB NOT NULL DEFAULT '[]',
    adaptation_confidence DECIMAL(3,2) NOT NULL CHECK (adaptation_confidence >= 0 AND adaptation_confidence <= 1),
    personalization_reasoning TEXT NOT NULL,
    context_factors JSONB NOT NULL DEFAULT '{}',
    performance_prediction DECIMAL(3,2) NOT NULL CHECK (performance_prediction >= 0 AND performance_prediction <= 1),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_personalized_responses_user (user_id),
    INDEX idx_personalized_responses_confidence (adaptation_confidence),
    INDEX idx_personalized_responses_prediction (performance_prediction),
    INDEX idx_personalized_responses_generated (generated_at),
    INDEX gin_personalized_responses_applied (personalization_applied),
    INDEX gin_personalized_responses_context (context_factors)
);

-- User behavior patterns table
CREATE TABLE IF NOT EXISTS pam_user_behavior_patterns (
    pattern_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 0,
    context_triggers JSONB NOT NULL DEFAULT '[]',
    behavioral_indicators JSONB NOT NULL DEFAULT '{}',
    temporal_patterns JSONB NOT NULL DEFAULT '{}',
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    last_observed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_behavior_patterns_user (user_id),
    INDEX idx_behavior_patterns_type (pattern_type),
    INDEX idx_behavior_patterns_frequency (frequency),
    INDEX idx_behavior_patterns_confidence (confidence),
    INDEX gin_behavior_patterns_triggers (context_triggers),
    INDEX gin_behavior_patterns_indicators (behavioral_indicators)
);

-- Personalization profiles table
CREATE TABLE IF NOT EXISTS pam_personalization_profiles (
    user_id TEXT PRIMARY KEY,
    preferences JSONB NOT NULL DEFAULT '{}',
    behavioral_patterns JSONB NOT NULL DEFAULT '[]',
    adaptation_history JSONB NOT NULL DEFAULT '[]',
    personality_traits JSONB NOT NULL DEFAULT '{}',
    contextual_preferences JSONB NOT NULL DEFAULT '{}',
    learning_trajectory JSONB NOT NULL DEFAULT '{}',
    interaction_style_evolution JSONB NOT NULL DEFAULT '[]',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.1 CHECK (profile_confidence >= 0 AND profile_confidence <= 1),
    
    -- Indexes
    INDEX idx_personalization_profiles_confidence (profile_confidence),
    INDEX idx_personalization_profiles_updated (last_updated),
    INDEX gin_personalization_profiles_preferences (preferences),
    INDEX gin_personalization_profiles_traits (personality_traits)
);

-- System Integration Tables

-- AI capability metrics table
CREATE TABLE IF NOT EXISTS pam_ai_capability_metrics (
    metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capability_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    metric_metadata JSONB NOT NULL DEFAULT '{}',
    measurement_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT,
    
    -- Indexes
    INDEX idx_ai_metrics_capability (capability_name),
    INDEX idx_ai_metrics_name (metric_name),
    INDEX idx_ai_metrics_timestamp (measurement_timestamp),
    INDEX idx_ai_metrics_user (user_id),
    INDEX gin_ai_metrics_metadata (metric_metadata)
);

-- Feature flags for gradual AI rollout
CREATE TABLE IF NOT EXISTS pam_ai_feature_flags (
    flag_id TEXT PRIMARY KEY,
    feature_name TEXT NOT NULL,
    user_id TEXT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    rollout_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    configuration JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(feature_name, user_id),
    
    -- Indexes
    INDEX idx_ai_feature_flags_feature (feature_name),
    INDEX idx_ai_feature_flags_user (user_id),
    INDEX idx_ai_feature_flags_enabled (enabled),
    INDEX gin_ai_feature_flags_config (configuration)
);

-- RLS Policies

-- Enable RLS on all AI tables
ALTER TABLE pam_knowledge_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_knowledge_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_reasoning_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_decision_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_emotional_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_empathic_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_multimodal_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_crossmodal_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_personalized_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_personalization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_ai_capability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_ai_feature_flags ENABLE ROW LEVEL SECURITY;

-- User-specific data access policies
CREATE POLICY "Users can access their own knowledge entities"
ON pam_knowledge_entities FOR ALL
USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can access their own reasoning chains"
ON pam_reasoning_chains FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own emotional states"
ON pam_emotional_states FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own empathic responses"
ON pam_empathic_responses FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own multimodal processing"
ON pam_multimodal_processing FOR ALL
USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can access their own personalized responses"
ON pam_personalized_responses FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own behavior patterns"
ON pam_user_behavior_patterns FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own personalization profile"
ON pam_personalization_profiles FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own AI metrics"
ON pam_ai_capability_metrics FOR ALL
USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can access their own feature flags"
ON pam_ai_feature_flags FOR ALL
USING (auth.uid()::text = user_id OR user_id IS NULL);

-- Service role policies for system operations
CREATE POLICY "Service role full access to knowledge relationships"
ON pam_knowledge_relationships FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to decision analyses"
ON pam_decision_analyses FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to crossmodal alignments"
ON pam_crossmodal_alignments FOR ALL
USING (auth.role() = 'service_role');

-- Advanced AI Functions

-- Function to calculate knowledge graph centrality
CREATE OR REPLACE FUNCTION calculate_knowledge_centrality(
    p_user_id TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
    result JSONB := '[]'::JSONB;
    entity_centrality RECORD;
BEGIN
    -- Calculate degree centrality for knowledge entities
    FOR entity_centrality IN
        SELECT 
            e.entity_id,
            e.name,
            e.entity_type,
            COUNT(DISTINCT r1.relationship_id) + COUNT(DISTINCT r2.relationship_id) as degree,
            AVG(r1.confidence) as avg_confidence
        FROM pam_knowledge_entities e
        LEFT JOIN pam_knowledge_relationships r1 ON e.entity_id = r1.source_entity_id
        LEFT JOIN pam_knowledge_relationships r2 ON e.entity_id = r2.target_entity_id
        WHERE (p_user_id IS NULL OR e.user_id = p_user_id)
        GROUP BY e.entity_id, e.name, e.entity_type
        ORDER BY degree DESC
        LIMIT p_limit
    LOOP
        result := result || jsonb_build_object(
            'entity_id', entity_centrality.entity_id,
            'name', entity_centrality.name,
            'entity_type', entity_centrality.entity_type,
            'degree_centrality', entity_centrality.degree,
            'confidence', COALESCE(entity_centrality.avg_confidence, 0.5)
        );
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get personalization insights
CREATE OR REPLACE FUNCTION get_personalization_insights(
    p_user_id TEXT
) RETURNS JSONB AS $$
DECLARE
    insights JSONB := '{}'::JSONB;
    total_responses INTEGER := 0;
    avg_confidence DECIMAL(3,2) := 0;
    common_personalizations JSONB;
BEGIN
    -- Get response statistics
    SELECT 
        COUNT(*),
        AVG(adaptation_confidence)
    INTO total_responses, avg_confidence
    FROM pam_personalized_responses
    WHERE user_id = p_user_id;
    
    -- Get most common personalizations
    SELECT jsonb_agg(
        jsonb_build_object(
            'personalization', personalization,
            'frequency', frequency
        ) ORDER BY frequency DESC
    )
    INTO common_personalizations
    FROM (
        SELECT 
            jsonb_array_elements_text(personalization_applied) as personalization,
            COUNT(*) as frequency
        FROM pam_personalized_responses
        WHERE user_id = p_user_id
        GROUP BY jsonb_array_elements_text(personalization_applied)
        ORDER BY COUNT(*) DESC
        LIMIT 5
    ) subq;
    
    -- Build insights object
    insights := jsonb_build_object(
        'total_personalized_responses', total_responses,
        'average_adaptation_confidence', COALESCE(avg_confidence, 0),
        'common_personalizations', COALESCE(common_personalizations, '[]'::JSONB),
        'profile_maturity', CASE 
            WHEN total_responses > 100 THEN 'mature'
            WHEN total_responses > 50 THEN 'developing'
            WHEN total_responses > 10 THEN 'emerging'
            ELSE 'initial'
        END,
        'generated_at', NOW()
    );
    
    RETURN insights;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze emotional patterns
CREATE OR REPLACE FUNCTION analyze_emotional_patterns(
    p_user_id TEXT,
    p_days_back INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
    patterns JSONB := '{}'::JSONB;
    dominant_emotions JSONB;
    intensity_trend DECIMAL(3,2);
    emotional_stability DECIMAL(3,2);
BEGIN
    -- Get dominant emotions
    SELECT jsonb_agg(
        jsonb_build_object(
            'emotion', primary_emotion,
            'frequency', frequency,
            'avg_intensity', avg_intensity
        ) ORDER BY frequency DESC
    )
    INTO dominant_emotions
    FROM (
        SELECT 
            primary_emotion,
            COUNT(*) as frequency,
            AVG(intensity) as avg_intensity
        FROM pam_emotional_states
        WHERE user_id = p_user_id
            AND timestamp > NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY primary_emotion
        ORDER BY COUNT(*) DESC
        LIMIT 5
    ) subq;
    
    -- Calculate intensity trend (recent vs older)
    WITH recent_intensity AS (
        SELECT AVG(intensity) as avg_intensity
        FROM pam_emotional_states
        WHERE user_id = p_user_id
            AND timestamp > NOW() - (p_days_back / 2 || ' days')::INTERVAL
    ),
    older_intensity AS (
        SELECT AVG(intensity) as avg_intensity
        FROM pam_emotional_states
        WHERE user_id = p_user_id
            AND timestamp BETWEEN 
                NOW() - (p_days_back || ' days')::INTERVAL AND 
                NOW() - (p_days_back / 2 || ' days')::INTERVAL
    )
    SELECT COALESCE(recent_intensity.avg_intensity - older_intensity.avg_intensity, 0)
    INTO intensity_trend
    FROM recent_intensity, older_intensity;
    
    -- Calculate emotional stability (lower stddev = more stable)
    SELECT 1 - LEAST(STDDEV(intensity), 1.0)
    INTO emotional_stability
    FROM pam_emotional_states
    WHERE user_id = p_user_id
        AND timestamp > NOW() - (p_days_back || ' days')::INTERVAL;
    
    -- Build patterns object
    patterns := jsonb_build_object(
        'dominant_emotions', COALESCE(dominant_emotions, '[]'::JSONB),
        'intensity_trend', COALESCE(intensity_trend, 0),
        'emotional_stability', COALESCE(emotional_stability, 0.5),
        'analysis_period_days', p_days_back,
        'generated_at', NOW()
    );
    
    RETURN patterns;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old AI data
CREATE OR REPLACE FUNCTION cleanup_old_ai_data(
    retention_days INTEGER DEFAULT 180
) RETURNS JSONB AS $$
DECLARE
    cleanup_stats JSONB := '{}'::JSONB;
    deleted_count INTEGER;
BEGIN
    -- Clean up old reasoning chains
    DELETE FROM pam_reasoning_chains 
    WHERE start_time < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_stats := jsonb_set(cleanup_stats, '{reasoning_chains_deleted}', deleted_count::TEXT::JSONB);
    
    -- Clean up old emotional states (keep summary stats)
    DELETE FROM pam_emotional_states 
    WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_stats := jsonb_set(cleanup_stats, '{emotional_states_deleted}', deleted_count::TEXT::JSONB);
    
    -- Clean up old multimodal processing results
    DELETE FROM pam_multimodal_processing 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_stats := jsonb_set(cleanup_stats, '{multimodal_results_deleted}', deleted_count::TEXT::JSONB);
    
    -- Clean up old personalized responses (keep recent for learning)
    DELETE FROM pam_personalized_responses 
    WHERE generated_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_stats := jsonb_set(cleanup_stats, '{personalized_responses_deleted}', deleted_count::TEXT::JSONB);
    
    -- Add cleanup timestamp
    cleanup_stats := jsonb_set(cleanup_stats, '{cleanup_timestamp}', ('"' || NOW()::TEXT || '"')::JSONB);
    
    RETURN cleanup_stats;
END;
$$ LANGUAGE plpgsql;

-- Initial AI capability features
INSERT INTO pam_ai_feature_flags (flag_id, feature_name, enabled, rollout_percentage, configuration) VALUES
    ('continuous_learning', 'Continuous Learning', true, 100.0, '{"learning_rate": 0.1, "min_interactions": 5}'),
    ('advanced_reasoning', 'Advanced Reasoning', true, 80.0, '{"max_depth": 5, "confidence_threshold": 0.7}'),
    ('emotional_intelligence', 'Emotional Intelligence', true, 90.0, '{"empathy_enabled": true, "crisis_detection": true}'),
    ('multimodal_processing', 'Multi-Modal Processing', false, 20.0, '{"vision_enabled": true, "audio_enabled": false}'),
    ('advanced_personalization', 'Advanced Personalization', true, 70.0, '{"adaptation_rate": 0.1, "min_interactions": 10}'),
    ('knowledge_graph', 'Knowledge Graph', false, 10.0, '{"auto_extraction": true, "confidence_threshold": 0.6}');

-- Performance indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kg_entities_composite
ON pam_knowledge_entities (entity_type, confidence DESC, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emotional_states_composite
ON pam_emotional_states (user_id, primary_emotion, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personalized_responses_composite
ON pam_personalized_responses (user_id, adaptation_confidence DESC, generated_at DESC);

-- Comments for documentation
COMMENT ON TABLE pam_knowledge_entities IS 'Entities in the PAM knowledge graph with embeddings and confidence scores';
COMMENT ON TABLE pam_knowledge_relationships IS 'Relationships between knowledge entities with typed connections';
COMMENT ON TABLE pam_reasoning_chains IS 'Multi-step reasoning processes with confidence tracking';
COMMENT ON TABLE pam_emotional_states IS 'Detected emotional states with intensity and context';
COMMENT ON TABLE pam_empathic_responses IS 'Empathic responses generated based on emotional analysis';
COMMENT ON TABLE pam_multimodal_processing IS 'Results from processing images, audio, and documents';
COMMENT ON TABLE pam_personalized_responses IS 'Personalized responses with adaptation metadata';
COMMENT ON TABLE pam_personalization_profiles IS 'Comprehensive user personalization profiles';
COMMENT ON TABLE pam_ai_capability_metrics IS 'Performance metrics for AI capabilities';
COMMENT ON TABLE pam_ai_feature_flags IS 'Feature flags for gradual AI capability rollout';