-- Agentic Context Engineering - Database Migration
-- Created: December 10, 2025
-- Purpose: Implements tiered memory system with pgvector for semantic search

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- TABLE 1: memories (Durable Memory - Tier 3)
-- Stores long-term facts, preferences, patterns with embeddings for semantic retrieval
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('fact', 'preference', 'pattern', 'instruction', 'correction')),
    embedding vector(1536),
    importance_score FLOAT DEFAULT 0.5,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    source_session_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- TABLE 2: sessions (Session Logs - Tier 2)
-- Stores session metadata and compacted summaries
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    session_summary JSONB DEFAULT '{}'::jsonb,
    message_count INTEGER DEFAULT 0,
    last_compaction_at TIMESTAMPTZ,
    compaction_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    summary_embedding vector(1536)
);

-- TABLE 3: events (Working Context - Tier 1)
-- Stores individual messages and events within a session
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('user_message', 'assistant_message', 'tool_call', 'tool_result', 'system_event', 'error', 'compaction_marker')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_compacted BOOLEAN DEFAULT FALSE,
    compacted_into_session_id UUID,
    sequence_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 4: artifacts (Artifact Storage - Tier 4)
-- Stores large objects as handles/pointers - LLM sees summary not full content
CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    artifact_type TEXT NOT NULL CHECK (artifact_type IN ('file', 'code_block', 'generated_content', 'api_response', 'search_results', 'trip_plan', 'budget_report', 'image')),
    name TEXT NOT NULL,
    handle TEXT UNIQUE NOT NULL,
    content TEXT,
    content_url TEXT,
    content_hash TEXT,
    summary TEXT NOT NULL,
    size_bytes BIGINT,
    mime_type TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ
);

-- TABLE 5: agent_state (Agent Self-Evolution - Principle 9)
-- Stores agent's learned behaviors and self-modifications
CREATE TABLE IF NOT EXISTS agent_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    system_prompt_additions TEXT,
    tool_preferences JSONB DEFAULT '{}'::jsonb,
    response_style_notes TEXT,
    learned_patterns JSONB DEFAULT '[]'::jsonb,
    recent_feedback JSONB DEFAULT '[]'::jsonb,
    version INTEGER DEFAULT 1,
    previous_state_id UUID REFERENCES agent_state(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_active ON memories(user_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_not_compacted ON events(session_id) WHERE is_compacted = FALSE;
CREATE INDEX IF NOT EXISTS idx_events_sequence ON events(session_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_artifacts_user_id ON artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_handle ON artifacts(handle);
CREATE INDEX IF NOT EXISTS idx_artifacts_session ON artifacts(session_id);

CREATE INDEX IF NOT EXISTS idx_agent_state_active ON agent_state(agent_id, user_id) WHERE is_active = TRUE;

-- Vector indexes for semantic search (IVFFlat for performance)
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_sessions_summary_embedding ON sessions USING ivfflat (summary_embedding vector_cosine_ops) WITH (lists = 100);

-- Row Level Security
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;

-- User isolation policies
DROP POLICY IF EXISTS memories_user_isolation ON memories;
CREATE POLICY memories_user_isolation ON memories FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_user_isolation ON sessions;
CREATE POLICY sessions_user_isolation ON sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS events_user_isolation ON events;
CREATE POLICY events_user_isolation ON events FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS artifacts_user_isolation ON artifacts;
CREATE POLICY artifacts_user_isolation ON artifacts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS agent_state_user_isolation ON agent_state;
CREATE POLICY agent_state_user_isolation ON agent_state FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Service role bypass policies
DROP POLICY IF EXISTS memories_service ON memories;
CREATE POLICY memories_service ON memories FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS sessions_service ON sessions;
CREATE POLICY sessions_service ON sessions FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS events_service ON events;
CREATE POLICY events_service ON events FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS artifacts_service ON artifacts;
CREATE POLICY artifacts_service ON artifacts FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS agent_state_service ON agent_state;
CREATE POLICY agent_state_service ON agent_state FOR ALL TO service_role USING (true);

-- Vector search function for memories
CREATE OR REPLACE FUNCTION search_memories(
    query_embedding vector(1536),
    match_user_id UUID,
    match_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    memory_type TEXT,
    importance_score FLOAT,
    access_count INT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        m.memory_type,
        m.importance_score,
        m.access_count,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM memories m
    WHERE m.user_id = match_user_id
      AND m.is_active = TRUE
      AND m.embedding IS NOT NULL
      AND 1 - (m.embedding <=> query_embedding) > match_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vector search function for sessions
CREATE OR REPLACE FUNCTION search_sessions(
    query_embedding vector(1536),
    match_user_id UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    session_summary JSONB,
    status TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.title,
        s.session_summary,
        s.status,
        1 - (s.summary_embedding <=> query_embedding) AS similarity
    FROM sessions s
    WHERE s.user_id = match_user_id
      AND s.summary_embedding IS NOT NULL
      AND 1 - (s.summary_embedding <=> query_embedding) > match_threshold
    ORDER BY s.summary_embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update memory access count
CREATE OR REPLACE FUNCTION update_memory_access(memory_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE memories
    SET access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE id = memory_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next sequence number for events
CREATE OR REPLACE FUNCTION get_next_event_sequence(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    INTO next_seq
    FROM events
    WHERE session_id = p_session_id;

    RETURN next_seq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_memories TO authenticated;
GRANT EXECUTE ON FUNCTION search_memories TO service_role;
GRANT EXECUTE ON FUNCTION search_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION search_sessions TO service_role;
GRANT EXECUTE ON FUNCTION update_memory_access TO authenticated;
GRANT EXECUTE ON FUNCTION update_memory_access TO service_role;
GRANT EXECUTE ON FUNCTION get_next_event_sequence TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_event_sequence TO service_role;
