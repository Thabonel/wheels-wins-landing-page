-- =====================================================
-- PAM MEMORY FOUNDATION - PHASE 2 DATABASE SCHEMA
-- Date: September 4, 2025
-- Purpose: Add intelligent memory, preferences, and pattern tracking
-- Dependencies: Requires existing pam_conversations and pam_messages tables
-- =====================================================

-- =====================================================
-- 1. ENABLE PGVECTOR EXTENSION
-- =====================================================
-- Enable vector operations for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 2. CREATE PAM MEMORIES TABLE
-- =====================================================
-- Core memory storage with vector embeddings for semantic search
CREATE TABLE public.pam_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Memory classification
    memory_type VARCHAR(20) CHECK (memory_type IN ('working', 'episodic', 'semantic')) NOT NULL,
    
    -- Content and embeddings
    content JSONB NOT NULL,
    content_text TEXT NOT NULL, -- Extracted text for embedding
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    
    -- Importance and access tracking
    importance_score FLOAT DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Context and relationships
    context JSONB DEFAULT '{}', -- Store page, trip_id, expense_id, conversation_id, etc.
    related_conversation_id UUID REFERENCES public.pam_conversations(id) ON DELETE SET NULL,
    
    -- Expiration and lifecycle
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'user_interaction', -- 'user_interaction', 'system_inference', 'import'
    tags TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE PAM USER PREFERENCES TABLE
-- =====================================================
-- Learned user preferences with confidence scoring
CREATE TABLE public.pam_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Preference classification
    category VARCHAR(50) NOT NULL, -- 'travel', 'budget', 'communication', 'vehicle', 'accommodation'
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    
    -- Confidence and learning
    confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    evidence_count INTEGER DEFAULT 1, -- How many interactions support this preference
    source VARCHAR(20) CHECK (source IN ('explicit', 'inferred', 'default')) NOT NULL DEFAULT 'inferred',
    
    -- Lifecycle
    active BOOLEAN DEFAULT true,
    last_confirmed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Context
    context JSONB DEFAULT '{}', -- When/where this preference was learned
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure uniqueness per user/category/key
    UNIQUE(user_id, category, preference_key)
);

-- =====================================================
-- 4. CREATE PAM INTENT PATTERNS TABLE
-- =====================================================
-- User behavior patterns for proactive assistance
CREATE TABLE public.pam_intent_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Pattern identification
    pattern_type VARCHAR(50) NOT NULL, -- 'route_planning', 'expense_tracking', 'campground_search', etc.
    pattern_signature TEXT NOT NULL, -- Normalized representation of the pattern
    
    -- Pattern data
    pattern_data JSONB NOT NULL, -- Detailed pattern information
    trigger_conditions JSONB DEFAULT '{}', -- When this pattern typically occurs
    
    -- Frequency and timing
    frequency INTEGER DEFAULT 1,
    last_occurrence TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    typical_time_of_day INTEGER, -- Hour of day (0-23) when this pattern occurs
    typical_day_of_week INTEGER, -- Day of week (0-6) when this pattern occurs
    
    -- Context
    context JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. CREATE MEMORY CLEANUP TRACKING TABLE
-- =====================================================
-- Track cleanup operations for compliance and optimization
CREATE TABLE public.pam_memory_cleanup_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Cleanup details
    cleanup_type VARCHAR(50) NOT NULL, -- 'expiration', 'user_request', 'gdpr_deletion', 'retention_policy'
    records_affected INTEGER NOT NULL DEFAULT 0,
    
    -- Execution details
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_time_ms INTEGER,
    
    -- Context
    context JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. CREATE PERFORMANCE INDEXES
-- =====================================================

-- Memory table indexes
CREATE INDEX idx_pam_memories_user_type ON public.pam_memories(user_id, memory_type);
CREATE INDEX idx_pam_memories_user_active ON public.pam_memories(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_pam_memories_expiration ON public.pam_memories(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_pam_memories_importance ON public.pam_memories(importance_score DESC);
CREATE INDEX idx_pam_memories_access ON public.pam_memories(last_accessed DESC);
CREATE INDEX idx_pam_memories_conversation ON public.pam_memories(related_conversation_id) WHERE related_conversation_id IS NOT NULL;

-- Vector similarity search index (using IVFFlat for performance)
CREATE INDEX idx_pam_memories_embedding ON public.pam_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Preferences indexes
CREATE INDEX idx_pam_preferences_active ON public.pam_user_preferences(user_id, active) WHERE active = true;
CREATE INDEX idx_pam_preferences_category ON public.pam_user_preferences(user_id, category, active);
CREATE INDEX idx_pam_preferences_confidence ON public.pam_user_preferences(confidence DESC) WHERE active = true;

-- Intent patterns indexes
CREATE INDEX idx_pam_intent_patterns_user_type ON public.pam_intent_patterns(user_id, pattern_type);
CREATE INDEX idx_pam_intent_patterns_frequency ON public.pam_intent_patterns(frequency DESC);
CREATE INDEX idx_pam_intent_patterns_last_occurrence ON public.pam_intent_patterns(last_occurrence DESC);
CREATE INDEX idx_pam_intent_patterns_time ON public.pam_intent_patterns(typical_time_of_day) WHERE typical_time_of_day IS NOT NULL;

-- =====================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.pam_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_intent_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_memory_cleanup_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. CREATE RLS POLICIES
-- =====================================================

-- PAM Memories policies
CREATE POLICY "Users can view their own memories" ON public.pam_memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories" ON public.pam_memories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" ON public.pam_memories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" ON public.pam_memories
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can access all memories" ON public.pam_memories
    FOR ALL USING (auth.role() = 'service_role');

-- PAM User Preferences policies
CREATE POLICY "Users can view their own preferences" ON public.pam_user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" ON public.pam_user_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can access all preferences" ON public.pam_user_preferences
    FOR ALL USING (auth.role() = 'service_role');

-- PAM Intent Patterns policies
CREATE POLICY "Users can view their own patterns" ON public.pam_intent_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all patterns" ON public.pam_intent_patterns
    FOR ALL USING (auth.role() = 'service_role');

-- Memory cleanup log (service role only)
CREATE POLICY "Service role can manage cleanup log" ON public.pam_memory_cleanup_log
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 9. CREATE UPDATED_AT TRIGGERS
-- =====================================================

-- Add updated_at triggers for all new tables
CREATE TRIGGER update_pam_memories_updated_at
    BEFORE UPDATE ON public.pam_memories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pam_preferences_updated_at
    BEFORE UPDATE ON public.pam_user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pam_intent_patterns_updated_at
    BEFORE UPDATE ON public.pam_intent_patterns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 10. CREATE MEMORY MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to automatically set expiration based on memory type
CREATE OR REPLACE FUNCTION public.set_memory_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- Set expiration based on memory type if not explicitly set
    IF NEW.expires_at IS NULL THEN
        CASE NEW.memory_type
            WHEN 'working' THEN
                NEW.expires_at = NOW() + INTERVAL '24 hours';
            WHEN 'episodic' THEN
                NEW.expires_at = NOW() + INTERVAL '30 days';
            WHEN 'semantic' THEN
                -- Semantic memories don't expire automatically
                NEW.expires_at = NULL;
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set expiration on insert
CREATE TRIGGER set_memory_expiration_trigger
    BEFORE INSERT ON public.pam_memories
    FOR EACH ROW EXECUTE FUNCTION public.set_memory_expiration();

-- =====================================================
-- 11. CREATE CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up expired memories (GDPR compliant)
CREATE OR REPLACE FUNCTION public.cleanup_expired_pam_memories()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired memories
    WITH deleted AS (
        DELETE FROM public.pam_memories 
        WHERE expires_at IS NOT NULL 
        AND expires_at < NOW()
        AND is_active = true
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Log the cleanup operation
    INSERT INTO public.pam_memory_cleanup_log (
        cleanup_type, 
        records_affected, 
        context
    ) VALUES (
        'expiration', 
        deleted_count,
        jsonb_build_object('cleaned_at', NOW())
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up low-importance, rarely accessed memories
CREATE OR REPLACE FUNCTION public.cleanup_low_value_memories(
    importance_threshold FLOAT DEFAULT 0.2,
    access_threshold INTEGER DEFAULT 0,
    age_threshold INTERVAL DEFAULT '7 days'
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete low-value memories that haven't been accessed
    WITH deleted AS (
        DELETE FROM public.pam_memories 
        WHERE importance_score < importance_threshold
        AND access_count <= access_threshold
        AND created_at < NOW() - age_threshold
        AND memory_type = 'working' -- Only clean working memories automatically
        AND is_active = true
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Log the cleanup operation
    INSERT INTO public.pam_memory_cleanup_log (
        cleanup_type, 
        records_affected, 
        context
    ) VALUES (
        'low_value_cleanup', 
        deleted_count,
        jsonb_build_object(
            'importance_threshold', importance_threshold,
            'access_threshold', access_threshold,
            'age_threshold', age_threshold,
            'cleaned_at', NOW()
        )
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for GDPR-compliant user data deletion
CREATE OR REPLACE FUNCTION public.delete_user_pam_memories(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete all memories for the user
    WITH deleted AS (
        DELETE FROM public.pam_memories 
        WHERE user_id = target_user_id
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Also delete preferences and patterns
    DELETE FROM public.pam_user_preferences WHERE user_id = target_user_id;
    DELETE FROM public.pam_intent_patterns WHERE user_id = target_user_id;
    
    -- Log the deletion
    INSERT INTO public.pam_memory_cleanup_log (
        cleanup_type, 
        records_affected, 
        context
    ) VALUES (
        'gdpr_deletion', 
        deleted_count,
        jsonb_build_object('user_id', target_user_id, 'deleted_at', NOW())
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. CREATE HELPER FUNCTIONS FOR MEMORY OPERATIONS
-- =====================================================

-- Function to update memory importance based on access patterns
CREATE OR REPLACE FUNCTION public.update_memory_importance(
    memory_id UUID,
    access_boost FLOAT DEFAULT 0.1
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.pam_memories 
    SET 
        importance_score = LEAST(1.0, importance_score + access_boost),
        access_count = access_count + 1,
        last_accessed = NOW()
    WHERE id = memory_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar memories using vector search
CREATE OR REPLACE FUNCTION public.find_similar_memories(
    target_user_id UUID,
    query_embedding vector(1536),
    similarity_threshold FLOAT DEFAULT 0.75,
    max_results INTEGER DEFAULT 10,
    memory_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content JSONB,
    importance_score FLOAT,
    similarity_score FLOAT,
    memory_type VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.content,
        m.importance_score,
        1 - (m.embedding <=> query_embedding) as similarity_score,
        m.memory_type,
        m.created_at
    FROM public.pam_memories m
    WHERE m.user_id = target_user_id
    AND m.is_active = true
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
    AND (memory_types IS NULL OR m.memory_type = ANY(memory_types))
    AND (1 - (m.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY similarity_score DESC, m.importance_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 13. CREATE SCHEDULED CLEANUP (OPTIONAL)
-- =====================================================

-- Note: The following would require pg_cron extension
-- Uncomment if you want automated cleanup every hour
-- SELECT cron.schedule('cleanup-expired-memories', '0 * * * *', 'SELECT public.cleanup_expired_pam_memories();');
-- SELECT cron.schedule('cleanup-low-value-memories', '0 2 * * *', 'SELECT public.cleanup_low_value_memories();');

-- =====================================================
-- 14. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_memories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_user_preferences TO authenticated;
GRANT SELECT ON public.pam_intent_patterns TO authenticated;

-- Grant full access to service role
GRANT ALL ON public.pam_memories TO service_role;
GRANT ALL ON public.pam_user_preferences TO service_role;
GRANT ALL ON public.pam_intent_patterns TO service_role;
GRANT ALL ON public.pam_memory_cleanup_log TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_pam_memories() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_low_value_memories(FLOAT, INTEGER, INTERVAL) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_pam_memories(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_memory_importance(UUID, FLOAT) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_similar_memories(UUID, vector(1536), FLOAT, INTEGER, TEXT[]) TO service_role;

-- =====================================================
-- 15. CREATE SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =====================================================

-- Insert sample memory types for testing (commented out for production)
-- INSERT INTO public.pam_memories (user_id, memory_type, content, content_text, importance_score, context)
-- VALUES 
-- (gen_random_uuid(), 'semantic', '{"type": "vehicle_preference", "data": {"vehicle_type": "unimog", "preferred_routes": "off_road"}}', 'User prefers Unimog for off-road adventures', 0.9, '{"source": "user_profile"}'),
-- (gen_random_uuid(), 'episodic', '{"type": "trip_memory", "data": {"destination": "Moab", "satisfaction": "high", "activities": ["rock_climbing", "camping"]}}', 'Great trip to Moab with rock climbing and camping', 0.8, '{"trip_id": "example_trip_123"}');

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Create a verification view for easy monitoring
CREATE VIEW public.pam_memory_stats AS
SELECT 
    'Memory Statistics' as stat_type,
    COUNT(*) as total_memories,
    COUNT(*) FILTER (WHERE memory_type = 'working') as working_memories,
    COUNT(*) FILTER (WHERE memory_type = 'episodic') as episodic_memories,
    COUNT(*) FILTER (WHERE memory_type = 'semantic') as semantic_memories,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_memories,
    COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW()) as expired_memories,
    AVG(importance_score) as avg_importance,
    COUNT(DISTINCT user_id) as users_with_memories
FROM public.pam_memories;

COMMENT ON TABLE public.pam_memories IS 'Core memory storage with vector embeddings for PAM AI assistant';
COMMENT ON TABLE public.pam_user_preferences IS 'Learned user preferences with confidence scoring';
COMMENT ON TABLE public.pam_intent_patterns IS 'User behavior patterns for proactive assistance';
COMMENT ON TABLE public.pam_memory_cleanup_log IS 'Audit log for memory cleanup operations';
COMMENT ON VIEW public.pam_memory_stats IS 'Monitoring view for PAM memory system statistics';

-- Migration completed successfully
SELECT 'PAM Memory Foundation migration completed successfully!' as status;