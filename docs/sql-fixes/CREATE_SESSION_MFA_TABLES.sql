-- Create tables for secure session management and MFA
-- Execute in Supabase SQL Editor

-- User MFA configuration table
CREATE TABLE IF NOT EXISTS user_mfa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL, -- TOTP secret (encrypted)
    backup_codes JSONB DEFAULT '[]', -- Hashed backup codes
    enabled BOOLEAN DEFAULT FALSE,
    setup_date TIMESTAMPTZ,
    disabled_date TIMESTAMPTZ,
    last_used TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Temporary MFA setup table (for verification before enabling)
CREATE TABLE IF NOT EXISTS user_mfa_setup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    backup_codes JSONB DEFAULT '[]',
    setup_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id),
    UNIQUE(setup_token)
);

-- User sessions table (for session tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    jti TEXT NOT NULL UNIQUE, -- JWT ID for blacklisting
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Token blacklist table (for immediate revocation)
CREATE TABLE IF NOT EXISTS token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jti TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    blacklisted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    reason TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON user_mfa(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_enabled ON user_mfa(enabled);

CREATE INDEX IF NOT EXISTS idx_user_mfa_setup_user_id ON user_mfa_setup(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_setup_token ON user_mfa_setup(setup_token);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_jti ON user_sessions(jti);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(jti);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Enable RLS
ALTER TABLE user_mfa ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mfa_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_blacklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_mfa
CREATE POLICY "Users can view their own MFA settings" ON user_mfa
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own MFA settings" ON user_mfa
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_mfa_setup
CREATE POLICY "Users can manage their own MFA setup" ON user_mfa_setup
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sessions" ON user_sessions
    FOR ALL USING (current_setting('role') = 'service_role');

-- RLS Policies for token_blacklist
CREATE POLICY "Service role can manage token blacklist" ON token_blacklist
    FOR ALL USING (current_setting('role') = 'service_role');

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_mfa_updated_at
    BEFORE UPDATE ON user_mfa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions and tokens
CREATE OR REPLACE FUNCTION cleanup_expired_auth_data()
RETURNS void AS $$
BEGIN
    -- Clean up expired sessions
    UPDATE user_sessions
    SET is_active = FALSE
    WHERE expires_at < NOW() AND is_active = TRUE;

    -- Clean up expired MFA setup data (older than 2 hours)
    DELETE FROM user_mfa_setup
    WHERE created_at < NOW() - INTERVAL '2 hours';

    -- Clean up expired blacklisted tokens
    DELETE FROM token_blacklist
    WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Grant necessary permissions
GRANT ALL ON user_mfa TO authenticated;
GRANT ALL ON user_mfa TO service_role;

GRANT ALL ON user_mfa_setup TO authenticated;
GRANT ALL ON user_mfa_setup TO service_role;

GRANT SELECT ON user_sessions TO authenticated;
GRANT ALL ON user_sessions TO service_role;

GRANT ALL ON token_blacklist TO service_role;