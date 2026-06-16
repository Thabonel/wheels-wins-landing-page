-- Pam V2 Durable State Schema
-- Conversation, message, tool-call, approval, and compact-summary storage.
-- Applied only to isolated staging Supabase project.

-- ============================================================
-- 1. CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS pam_v2_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pam_v2_conversations_user_id
    ON pam_v2_conversations (user_id, created_at DESC);

COMMENT ON TABLE pam_v2_conversations IS 'Per-user Pam V2 conversations';
COMMENT ON COLUMN pam_v2_conversations.id IS 'Stable conversation identifier matching conversation_id in turn requests';
COMMENT ON COLUMN pam_v2_conversations.user_id IS 'Authenticated user ID (subject to RLS)';

-- ============================================================
-- 2. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS pam_v2_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES pam_v2_conversations(id) ON DELETE CASCADE,
    client_message_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT,
    tool_call_id TEXT,
    tool_name TEXT,
    tool_arguments JSONB,
    token_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pam_v2_messages_conversation
    ON pam_v2_messages (conversation_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pam_v2_messages_client_id
    ON pam_v2_messages (conversation_id, client_message_id);

COMMENT ON TABLE pam_v2_messages IS 'Messages within a Pam V2 conversation';
COMMENT ON COLUMN pam_v2_messages.client_message_id IS 'Client-provided idempotency key unique per conversation';
COMMENT ON COLUMN pam_v2_messages.tool_call_id IS 'Tool call identifier for tool-role messages';

-- ============================================================
-- 3. TOOL CALLS
-- ============================================================
CREATE TABLE IF NOT EXISTS pam_v2_tool_calls (
    id TEXT NOT NULL,
    conversation_id UUID NOT NULL REFERENCES pam_v2_conversations(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES pam_v2_messages(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    arguments_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error', 'blocked')),
    result_code TEXT,
    result_summary TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, id)
);

CREATE INDEX IF NOT EXISTS idx_pam_v2_tool_calls_message
    ON pam_v2_tool_calls (message_id);

COMMENT ON TABLE pam_v2_tool_calls IS 'Execution records for Pam V2 tool calls';
COMMENT ON COLUMN pam_v2_tool_calls.arguments_hash IS 'SHA-256 of canonical (tool_name + sorted arguments)';

-- ============================================================
-- 4. APPROVALS
-- ============================================================
CREATE TABLE IF NOT EXISTS pam_v2_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES pam_v2_conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    arguments_hash TEXT NOT NULL,
    action_summary TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'denied', 'expired', 'consumed')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pam_v2_approvals_token_hash
    ON pam_v2_approvals (token_hash);

CREATE INDEX IF NOT EXISTS idx_pam_v2_approvals_conversation
    ON pam_v2_approvals (conversation_id);

COMMENT ON TABLE pam_v2_approvals IS 'Exact-action approval records for write tool execution';
COMMENT ON COLUMN pam_v2_approvals.token_hash IS 'SHA-256 of the opaque approval token; never stored in plaintext';
COMMENT ON COLUMN pam_v2_approvals.status IS 'Lifecycle: requested -> approved -> consumed, or denied/expired';

-- ============================================================
-- 5. COMPACT SUMMARIES
-- ============================================================
CREATE TABLE IF NOT EXISTS pam_v2_compact_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES pam_v2_conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    model_version TEXT NOT NULL DEFAULT '2026-06-16',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pam_v2_compact_summaries_conversation
    ON pam_v2_compact_summaries (conversation_id, created_at DESC);

COMMENT ON TABLE pam_v2_compact_summaries IS 'Structured compact summaries of conversation state';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE pam_v2_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_v2_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_v2_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_v2_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_v2_compact_summaries ENABLE ROW LEVEL SECURITY;

-- Service role: full access
CREATE POLICY service_role_full_access ON pam_v2_conversations
    FOR ALL TO service_role USING (true);
CREATE POLICY service_role_full_access ON pam_v2_messages
    FOR ALL TO service_role USING (true);
CREATE POLICY service_role_full_access ON pam_v2_tool_calls
    FOR ALL TO service_role USING (true);
CREATE POLICY service_role_full_access ON pam_v2_approvals
    FOR ALL TO service_role USING (true);
CREATE POLICY service_role_full_access ON pam_v2_compact_summaries
    FOR ALL TO service_role USING (true);

-- Authenticated users: own data only
CREATE POLICY user_own_conversations ON pam_v2_conversations
    FOR ALL TO authenticated
    USING (user_id = auth.uid()::TEXT);

CREATE POLICY user_own_messages ON pam_v2_messages
    FOR ALL TO authenticated
    USING (conversation_id IN (
        SELECT id FROM pam_v2_conversations WHERE user_id = auth.uid()::TEXT
    ));

CREATE POLICY user_own_tool_calls ON pam_v2_tool_calls
    FOR ALL TO authenticated
    USING (conversation_id IN (
        SELECT id FROM pam_v2_conversations WHERE user_id = auth.uid()::TEXT
    ));

CREATE POLICY user_own_approvals ON pam_v2_approvals
    FOR ALL TO authenticated
    USING (user_id = auth.uid()::TEXT);

CREATE POLICY user_own_compact_summaries ON pam_v2_compact_summaries
    FOR ALL TO authenticated
    USING (conversation_id IN (
        SELECT id FROM pam_v2_conversations WHERE user_id = auth.uid()::TEXT
    ));

-- ============================================================
-- GRANTS
-- ============================================================
GRANT ALL ON pam_v2_conversations TO service_role, authenticated;
GRANT ALL ON pam_v2_messages TO service_role, authenticated;
GRANT ALL ON pam_v2_tool_calls TO service_role, authenticated;
GRANT ALL ON pam_v2_approvals TO service_role, authenticated;
GRANT ALL ON pam_v2_compact_summaries TO service_role, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role, authenticated;
