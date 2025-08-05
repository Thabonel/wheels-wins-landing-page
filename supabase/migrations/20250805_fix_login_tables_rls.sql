-- Fix RLS policies for user_login_history and user_active_sessions tables

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own login history" ON user_login_history;
DROP POLICY IF EXISTS "System can insert login history" ON user_login_history;
DROP POLICY IF EXISTS "Users can view own active sessions" ON user_active_sessions;
DROP POLICY IF EXISTS "System can manage sessions" ON user_active_sessions;

-- Enable RLS on tables if not already enabled
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_sessions ENABLE ROW LEVEL SECURITY;

-- user_login_history policies
CREATE POLICY "Users can view own login history" ON user_login_history
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert login history" ON user_login_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage login history" ON user_login_history
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- user_active_sessions policies
CREATE POLICY "Users can view own active sessions" ON user_active_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can manage own sessions" ON user_active_sessions
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sessions" ON user_active_sessions
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');