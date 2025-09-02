-- Phase 2: PAM Agent Vector Memory Tables
-- Create tables for storing conversation embeddings and user memories

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for storing conversation embeddings
CREATE TABLE IF NOT EXISTS pam_conversation_embeddings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    conversation_id UUID,
    
    -- Original conversation data
    user_message TEXT NOT NULL,
    agent_response TEXT NOT NULL,
    message_context JSONB DEFAULT '{}',
    
    -- Vector embeddings (1536 dimensions for text-embedding-3-small)
    user_message_embedding vector(1536),
    agent_response_embedding vector(1536), 
    combined_embedding vector(1536),
    
    -- Metadata
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    processing_metadata JSONB DEFAULT '{}',
    
    -- Conversation metadata
    intent VARCHAR(100),
    entities JSONB DEFAULT '[]',
    sentiment FLOAT,
    confidence_score FLOAT DEFAULT 1.0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for efficient querying
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table for storing user preference embeddings
CREATE TABLE IF NOT EXISTS pam_user_preferences_embeddings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    
    -- Preference data
    preference_key VARCHAR(200) NOT NULL,
    preference_value JSONB NOT NULL,
    preference_text TEXT NOT NULL,
    
    -- Vector embedding
    preference_embedding vector(1536),
    
    -- Metadata
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    user_context JSONB DEFAULT '{}',
    
    -- Learning metadata
    confidence FLOAT DEFAULT 1.0,
    source VARCHAR(100) DEFAULT 'explicit', -- explicit, inferred, learned
    frequency_score FLOAT DEFAULT 1.0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT fk_user_preferences_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_preference UNIQUE (user_id, preference_key)
);

-- Table for storing contextual memories (locations, experiences, patterns)
CREATE TABLE IF NOT EXISTS pam_contextual_memories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    
    -- Memory content
    memory_type VARCHAR(100) NOT NULL, -- trip, expense, location, experience, pattern
    memory_content TEXT NOT NULL,
    memory_summary TEXT,
    
    -- Vector embedding
    memory_embedding vector(1536),
    
    -- Contextual data
    location_data JSONB DEFAULT '{}', -- lat/lng, place names, regions
    temporal_data JSONB DEFAULT '{}', -- dates, seasons, frequencies
    associated_entities JSONB DEFAULT '[]', -- people, places, activities
    
    -- Relevance scoring
    importance_score FLOAT DEFAULT 1.0,
    access_frequency INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    source VARCHAR(100) DEFAULT 'conversation', -- conversation, system, import
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_contextual_memories_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create efficient indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_conversation_embeddings_user_combined 
    ON pam_conversation_embeddings USING ivfflat (combined_embedding vector_cosine_ops) 
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_conversation_embeddings_user_message 
    ON pam_conversation_embeddings USING ivfflat (user_message_embedding vector_cosine_ops) 
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_preference_embeddings_user 
    ON pam_user_preferences_embeddings USING ivfflat (preference_embedding vector_cosine_ops) 
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_contextual_memories_embedding 
    ON pam_contextual_memories USING ivfflat (memory_embedding vector_cosine_ops) 
    WITH (lists = 100);

-- Traditional indexes for filtering
CREATE INDEX IF NOT EXISTS idx_conversation_embeddings_user_id_created 
    ON pam_conversation_embeddings (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_embeddings_intent 
    ON pam_conversation_embeddings (user_id, intent) 
    WHERE intent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_preference_embeddings_user_key 
    ON pam_user_preferences_embeddings (user_id, preference_key);

CREATE INDEX IF NOT EXISTS idx_contextual_memories_user_type 
    ON pam_contextual_memories (user_id, memory_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contextual_memories_importance 
    ON pam_contextual_memories (user_id, importance_score DESC) 
    WHERE importance_score > 0.5;

-- Row Level Security policies
ALTER TABLE pam_conversation_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_user_preferences_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_contextual_memories ENABLE ROW LEVEL SECURITY;

-- Users can only access their own embeddings and memories
CREATE POLICY "Users can view own conversation embeddings" ON pam_conversation_embeddings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation embeddings" ON pam_conversation_embeddings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation embeddings" ON pam_conversation_embeddings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversation embeddings" ON pam_conversation_embeddings
    FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for preferences
CREATE POLICY "Users can view own preference embeddings" ON pam_user_preferences_embeddings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preference embeddings" ON pam_user_preferences_embeddings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preference embeddings" ON pam_user_preferences_embeddings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preference embeddings" ON pam_user_preferences_embeddings
    FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for contextual memories
CREATE POLICY "Users can view own contextual memories" ON pam_contextual_memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contextual memories" ON pam_contextual_memories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contextual memories" ON pam_contextual_memories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contextual memories" ON pam_contextual_memories
    FOR DELETE USING (auth.uid() = user_id);

-- Service role policies (for PAM backend operations)
CREATE POLICY "Service role can manage all conversation embeddings" ON pam_conversation_embeddings
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all preference embeddings" ON pam_user_preferences_embeddings
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all contextual memories" ON pam_contextual_memories
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_conversation_embeddings_updated_at 
    BEFORE UPDATE ON pam_conversation_embeddings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preference_embeddings_updated_at 
    BEFORE UPDATE ON pam_user_preferences_embeddings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contextual_memories_updated_at 
    BEFORE UPDATE ON pam_contextual_memories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Utility functions for vector similarity search
CREATE OR REPLACE FUNCTION find_similar_conversations(
    target_user_id UUID,
    query_embedding vector(1536),
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    user_message TEXT,
    agent_response TEXT,
    similarity_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.user_message,
        ce.agent_response,
        (1 - (ce.combined_embedding <=> query_embedding)) AS similarity_score,
        ce.created_at
    FROM pam_conversation_embeddings ce
    WHERE 
        ce.user_id = target_user_id
        AND (1 - (ce.combined_embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY ce.combined_embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION find_relevant_preferences(
    target_user_id UUID,
    query_embedding vector(1536),
    similarity_threshold FLOAT DEFAULT 0.6,
    max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
    preference_key VARCHAR(200),
    preference_value JSONB,
    similarity_score FLOAT,
    confidence FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.preference_key,
        pe.preference_value,
        (1 - (pe.preference_embedding <=> query_embedding)) AS similarity_score,
        pe.confidence
    FROM pam_user_preferences_embeddings pe
    WHERE 
        pe.user_id = target_user_id
        AND (1 - (pe.preference_embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY pe.preference_embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION find_contextual_memories(
    target_user_id UUID,
    query_embedding vector(1536),
    memory_types TEXT[] DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.6,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    memory_type VARCHAR(100),
    memory_content TEXT,
    memory_summary TEXT,
    similarity_score FLOAT,
    importance_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.id,
        cm.memory_type,
        cm.memory_content,
        cm.memory_summary,
        (1 - (cm.memory_embedding <=> query_embedding)) AS similarity_score,
        cm.importance_score,
        cm.created_at
    FROM pam_contextual_memories cm
    WHERE 
        cm.user_id = target_user_id
        AND (memory_types IS NULL OR cm.memory_type = ANY(memory_types))
        AND (1 - (cm.memory_embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY 
        (cm.memory_embedding <=> query_embedding),
        cm.importance_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON pam_conversation_embeddings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pam_user_preferences_embeddings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pam_contextual_memories TO authenticated;

GRANT ALL ON pam_conversation_embeddings TO service_role;
GRANT ALL ON pam_user_preferences_embeddings TO service_role;
GRANT ALL ON pam_contextual_memories TO service_role;

GRANT EXECUTE ON FUNCTION find_similar_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION find_relevant_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION find_contextual_memories TO authenticated;

GRANT EXECUTE ON FUNCTION find_similar_conversations TO service_role;
GRANT EXECUTE ON FUNCTION find_relevant_preferences TO service_role;
GRANT EXECUTE ON FUNCTION find_contextual_memories TO service_role;