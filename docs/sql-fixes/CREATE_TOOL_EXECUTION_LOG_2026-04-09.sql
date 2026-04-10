CREATE TABLE IF NOT EXISTS tool_execution_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tool_name TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    execution_time_ms INTEGER,
    error_message TEXT,
    error_code TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_log_name_created
    ON tool_execution_log(tool_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_log_failures
    ON tool_execution_log(success, created_at DESC)
    WHERE NOT success;

ALTER TABLE tool_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON tool_execution_log
    FOR ALL
    USING (true)
    WITH CHECK (true);
