-- PAM Phase 8: Advanced User Experience - Database Schema
-- Create tables for cross-platform, personalized dashboard, voice/gesture controls, AR, analytics, and adaptive UI systems

-- Cross-Platform System Tables
CREATE TABLE IF NOT EXISTS pam_device_profiles (
    device_id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    capabilities TEXT[] DEFAULT '{}',
    screen_size JSONB DEFAULT '{}',
    screen_density REAL DEFAULT 1.0,
    os_version TEXT,
    app_version TEXT,
    connection_type TEXT,
    accessibility_features TEXT[] DEFAULT '{}',
    preferred_language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    location_permission BOOLEAN DEFAULT FALSE,
    notification_permission BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pam_user_interactions (
    interaction_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES pam_device_profiles(device_id),
    interaction_type TEXT NOT NULL,
    component_id TEXT,
    context JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    duration_ms INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS pam_ui_components (
    component_id TEXT PRIMARY KEY,
    component_type TEXT NOT NULL,
    platform_variants JSONB DEFAULT '{}',
    accessibility_info JSONB DEFAULT '{}',
    responsive_breakpoints JSONB DEFAULT '{}',
    animations JSONB DEFAULT '{}',
    gestures TEXT[] DEFAULT '{}',
    voice_commands TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personalized Dashboard System Tables
CREATE TABLE IF NOT EXISTS pam_dashboard_layouts (
    layout_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    layout_type TEXT NOT NULL,
    widgets JSONB DEFAULT '[]',
    theme_config JSONB DEFAULT '{}',
    responsive_rules JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pam_widget_interactions (
    interaction_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    widget_type TEXT NOT NULL,
    interaction_count INTEGER DEFAULT 1,
    total_time_spent REAL DEFAULT 0,
    last_interaction TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pam_user_behavior_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_patterns JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    device_usage_patterns JSONB DEFAULT '{}',
    content_preferences JSONB DEFAULT '{}',
    active_hours INTEGER[] DEFAULT '{}',
    preferred_layout TEXT DEFAULT 'grid',
    last_active TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice and Gesture Control System Tables
CREATE TABLE IF NOT EXISTS pam_voice_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    voice_signature JSONB DEFAULT '{}',
    accent TEXT,
    language TEXT DEFAULT 'en',
    speech_rate REAL DEFAULT 1.0,
    pitch_range REAL[] DEFAULT '{0,0}',
    volume_preference REAL DEFAULT 0.5,
    noise_tolerance REAL DEFAULT 0.5,
    wake_words TEXT[] DEFAULT '{}',
    command_shortcuts JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pam_gesture_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    dominant_hand TEXT DEFAULT 'right',
    gesture_sensitivity REAL DEFAULT 0.5,
    custom_gestures JSONB DEFAULT '{}',
    accessibility_adaptations TEXT[] DEFAULT '{}',
    gesture_speed_preference REAL DEFAULT 1.0,
    gesture_size_preference REAL DEFAULT 1.0,
    camera_position_preference TEXT DEFAULT 'front',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pam_voice_commands (
    command_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    processed_text TEXT,
    intent TEXT,
    entities JSONB DEFAULT '{}',
    confidence_score REAL DEFAULT 0.0,
    context JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    response_time REAL DEFAULT 0.0,
    success BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pam_gesture_commands (
    command_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gesture_type TEXT NOT NULL,
    coordinates JSONB DEFAULT '[]',
    confidence_score REAL DEFAULT 0.0,
    context JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    processing_time REAL DEFAULT 0.0,
    success BOOLEAN DEFAULT TRUE
);

-- Augmented Reality System Tables
CREATE TABLE IF NOT EXISTS pam_ar_sessions (
    session_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    feature_type TEXT NOT NULL,
    camera_position REAL[] DEFAULT '{0,0,0}',
    camera_rotation REAL[] DEFAULT '{0,0,0,1}',
    device_orientation TEXT DEFAULT 'portrait',
    gps_location POINT,
    session_duration INTEGER DEFAULT 0,
    performance_metrics JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pam_ar_objects (
    object_id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES pam_ar_sessions(session_id) ON DELETE CASCADE,
    object_type TEXT NOT NULL,
    position REAL[] DEFAULT '{0,0,0}',
    rotation REAL[] DEFAULT '{0,0,0,1}',
    scale REAL[] DEFAULT '{1,1,1}',
    model_url TEXT,
    texture_urls TEXT[] DEFAULT '{}',
    animation_data JSONB DEFAULT '{}',
    interaction_zones JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pam_ar_interactions (
    interaction_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES pam_ar_sessions(session_id) ON DELETE CASCADE,
    object_id TEXT REFERENCES pam_ar_objects(object_id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL,
    screen_coordinates REAL[] DEFAULT '{0,0}',
    world_coordinates REAL[] DEFAULT '{0,0,0}',
    success BOOLEAN DEFAULT TRUE,
    duration_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics and Business Intelligence System Tables
CREATE TABLE IF NOT EXISTS pam_analytics_queries (
    query_id TEXT PRIMARY KEY,
    query_name TEXT NOT NULL,
    analytics_type TEXT NOT NULL,
    metrics TEXT[] DEFAULT '{}',
    dimensions TEXT[] DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    time_range JSONB DEFAULT '{}',
    aggregation TEXT DEFAULT 'count',
    visualization TEXT DEFAULT 'line_chart',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pam_analytics_dashboards (
    dashboard_id TEXT PRIMARY KEY,
    dashboard_name TEXT NOT NULL,
    widgets JSONB DEFAULT '[]',
    layout JSONB DEFAULT '{}',
    refresh_schedule TEXT DEFAULT 'hourly',
    access_permissions TEXT[] DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pam_business_insights (
    insight_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    confidence_score REAL DEFAULT 0.0,
    impact_score REAL DEFAULT 0.0,
    actionable BOOLEAN DEFAULT FALSE,
    recommendations TEXT[] DEFAULT '{}',
    data_points JSONB DEFAULT '{}',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pam_system_metrics (
    metric_id SERIAL PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT,
    dimensions JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    INDEX (metric_name, timestamp)
);

-- Adaptive UI System Tables
CREATE TABLE IF NOT EXISTS pam_ui_adaptations (
    adaptation_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    adaptation_type TEXT NOT NULL,
    target_element TEXT NOT NULL,
    original_properties JSONB DEFAULT '{}',
    adapted_properties JSONB DEFAULT '{}',
    confidence_score REAL DEFAULT 0.0,
    impact_score REAL DEFAULT 0.0,
    trigger_type TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pam_ui_adaptation_feedback (
    feedback_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    adaptation_id TEXT REFERENCES pam_ui_adaptations(adaptation_id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL, -- 'positive', 'negative', 'neutral'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    helpful BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pam_user_ui_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_patterns JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    accessibility_needs TEXT[] DEFAULT '{}',
    device_usage_patterns JSONB DEFAULT '{}',
    cognitive_load_indicators JSONB DEFAULT '{}',
    adaptation_feedback JSONB DEFAULT '{}',
    ui_expertise_level REAL DEFAULT 0.5,
    preferred_interaction_methods TEXT[] DEFAULT '{}',
    color_preferences JSONB DEFAULT '{}',
    typography_preferences JSONB DEFAULT '{}',
    layout_preferences JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pam_contextual_factors (
    factor_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    factor_type TEXT NOT NULL,
    factor_value JSONB NOT NULL,
    confidence REAL DEFAULT 0.0,
    impact_weight REAL DEFAULT 0.0,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON pam_user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON pam_user_interactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_voice_commands_user_id ON pam_voice_commands(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_commands_timestamp ON pam_voice_commands(timestamp);
CREATE INDEX IF NOT EXISTS idx_gesture_commands_user_id ON pam_gesture_commands(user_id);
CREATE INDEX IF NOT EXISTS idx_gesture_commands_timestamp ON pam_gesture_commands(timestamp);
CREATE INDEX IF NOT EXISTS idx_ar_sessions_user_id ON pam_ar_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_sessions_started_at ON pam_ar_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_ui_adaptations_user_id ON pam_ui_adaptations(user_id);
CREATE INDEX IF NOT EXISTS idx_ui_adaptations_applied_at ON pam_ui_adaptations(applied_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_timestamp ON pam_system_metrics(metric_name, timestamp);

-- RLS Policies
ALTER TABLE pam_device_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_dashboard_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_widget_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_user_behavior_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_gesture_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_voice_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_gesture_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_ar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_ar_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_ui_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_ui_adaptation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_user_ui_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_contextual_factors ENABLE ROW LEVEL SECURITY;

-- User can only access their own data
CREATE POLICY "Users can access own device profiles" ON pam_device_profiles FOR ALL USING (true); -- Device profiles are shared
CREATE POLICY "Users can access own interactions" ON pam_user_interactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own dashboard layouts" ON pam_dashboard_layouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own widget interactions" ON pam_widget_interactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own behavior profiles" ON pam_user_behavior_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own voice profiles" ON pam_voice_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own gesture profiles" ON pam_gesture_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own voice commands" ON pam_voice_commands FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own gesture commands" ON pam_gesture_commands FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own AR sessions" ON pam_ar_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own AR interactions" ON pam_ar_interactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own UI adaptations" ON pam_ui_adaptations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own UI feedback" ON pam_ui_adaptation_feedback FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own UI profiles" ON pam_user_ui_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own contextual factors" ON pam_contextual_factors FOR ALL USING (auth.uid() = user_id);

-- Analytics tables are accessible to admins and analysts
CREATE POLICY "Admin access to analytics queries" ON pam_analytics_queries FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'analyst'))
);

CREATE POLICY "Admin access to analytics dashboards" ON pam_analytics_dashboards FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'analyst'))
);

CREATE POLICY "Admin access to business insights" ON pam_business_insights FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'analyst'))
);

CREATE POLICY "Admin access to system metrics" ON pam_system_metrics FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'analyst'))
);

-- UI components are publicly readable but only admins can modify
CREATE POLICY "Public read access to UI components" ON pam_ui_components FOR SELECT USING (true);
CREATE POLICY "Admin write access to UI components" ON pam_ui_components FOR INSERT, UPDATE, DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- AR objects are accessible to session participants
CREATE POLICY "Session participants can access AR objects" ON pam_ar_objects FOR ALL USING (
    EXISTS (
        SELECT 1 FROM pam_ar_sessions 
        WHERE session_id = pam_ar_objects.session_id 
        AND user_id = auth.uid()
    )
);

-- Functions for analytics and insights
CREATE OR REPLACE FUNCTION calculate_user_engagement_score(user_uuid UUID, days INTEGER DEFAULT 30)
RETURNS REAL AS $$
DECLARE
    interaction_count INTEGER;
    unique_days INTEGER;
    avg_session_duration REAL;
    engagement_score REAL;
BEGIN
    -- Count interactions in the period
    SELECT COUNT(*) INTO interaction_count
    FROM pam_user_interactions 
    WHERE user_id = user_uuid 
    AND timestamp >= NOW() - INTERVAL '1 day' * days;
    
    -- Count unique active days
    SELECT COUNT(DISTINCT DATE(timestamp)) INTO unique_days
    FROM pam_user_interactions 
    WHERE user_id = user_uuid 
    AND timestamp >= NOW() - INTERVAL '1 day' * days;
    
    -- Calculate average session duration (in minutes)
    SELECT AVG(duration_ms / 1000.0 / 60.0) INTO avg_session_duration
    FROM pam_user_interactions 
    WHERE user_id = user_uuid 
    AND timestamp >= NOW() - INTERVAL '1 day' * days;
    
    -- Calculate engagement score (0-100)
    engagement_score := LEAST(100.0, 
        (interaction_count * 0.3) + 
        (unique_days * 2.0) + 
        (COALESCE(avg_session_duration, 0) * 0.5)
    );
    
    RETURN engagement_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_popular_ui_adaptations(days INTEGER DEFAULT 30)
RETURNS TABLE(adaptation_type TEXT, usage_count BIGINT, avg_satisfaction REAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.adaptation_type,
        COUNT(*) as usage_count,
        AVG(CASE 
            WHEN uaf.feedback_type = 'positive' THEN 5.0
            WHEN uaf.feedback_type = 'neutral' THEN 3.0
            WHEN uaf.feedback_type = 'negative' THEN 1.0
            ELSE NULL
        END) as avg_satisfaction
    FROM pam_ui_adaptations ua
    LEFT JOIN pam_ui_adaptation_feedback uaf ON ua.adaptation_id = uaf.adaptation_id
    WHERE ua.applied_at >= NOW() - INTERVAL '1 day' * days
    GROUP BY ua.adaptation_type
    ORDER BY usage_count DESC, avg_satisfaction DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION detect_usage_anomalies(metric_name TEXT, threshold_multiplier REAL DEFAULT 2.0)
RETURNS TABLE(timestamp TIMESTAMPTZ, metric_value REAL, expected_range TEXT) AS $$
DECLARE
    avg_value REAL;
    std_dev REAL;
    upper_threshold REAL;
    lower_threshold REAL;
BEGIN
    -- Calculate average and standard deviation for the metric
    SELECT AVG(metric_value), STDDEV(metric_value) 
    INTO avg_value, std_dev
    FROM pam_system_metrics 
    WHERE metric_name = detect_usage_anomalies.metric_name
    AND timestamp >= NOW() - INTERVAL '7 days';
    
    upper_threshold := avg_value + (std_dev * threshold_multiplier);
    lower_threshold := avg_value - (std_dev * threshold_multiplier);
    
    -- Return anomalous values
    RETURN QUERY
    SELECT 
        sm.timestamp,
        sm.metric_value,
        CONCAT('Expected: ', ROUND(avg_value, 2), ' ± ', ROUND(std_dev * threshold_multiplier, 2)) as expected_range
    FROM pam_system_metrics sm
    WHERE sm.metric_name = detect_usage_anomalies.metric_name
    AND sm.timestamp >= NOW() - INTERVAL '24 hours'
    AND (sm.metric_value > upper_threshold OR sm.metric_value < lower_threshold)
    ORDER BY sm.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;