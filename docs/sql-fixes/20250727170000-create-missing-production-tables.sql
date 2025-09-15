-- Create missing production tables identified from console errors
-- Migration: 20250727170000-create-missing-production-tables.sql

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_type VARCHAR(50) NOT NULL DEFAULT 'free',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    plan_id VARCHAR(50),
    customer_id VARCHAR(100), -- Stripe customer ID
    subscription_id VARCHAR(100), -- Stripe subscription ID
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_type ON user_subscriptions(subscription_type);

-- Create user_login_history table
CREATE TABLE IF NOT EXISTS user_login_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    login_method VARCHAR(50) DEFAULT 'email', -- email, oauth, etc.
    success BOOLEAN DEFAULT TRUE,
    failure_reason TEXT,
    session_id UUID,
    device_info JSONB DEFAULT '{}'::jsonb,
    location_info JSONB DEFAULT '{}'::jsonb -- Country, city, etc.
);

-- Create indexes for user_login_history
CREATE INDEX IF NOT EXISTS idx_user_login_history_user_id ON user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_history_timestamp ON user_login_history(login_timestamp);
CREATE INDEX IF NOT EXISTS idx_user_login_history_success ON user_login_history(success);

-- Create user_active_sessions table
CREATE TABLE IF NOT EXISTS user_active_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50), -- mobile, desktop, tablet
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for user_active_sessions
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_user_id ON user_active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_session_id ON user_active_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_active ON user_active_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_expires ON user_active_sessions(expires_at);

-- Add updated_at trigger for user_subscriptions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for user_active_sessions
CREATE TRIGGER update_user_active_sessions_updated_at 
    BEFORE UPDATE ON user_active_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for Stripe webhooks)
CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for user_login_history
CREATE POLICY "Users can view their own login history" ON user_login_history
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert login history
CREATE POLICY "Service role can insert login history" ON user_login_history
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policies for user_active_sessions
CREATE POLICY "Users can view their own active sessions" ON user_active_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own active sessions" ON user_active_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all sessions
CREATE POLICY "Service role can manage sessions" ON user_active_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Create a function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    -- Mark expired sessions as inactive
    UPDATE user_active_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    -- Delete very old inactive sessions (older than 30 days)
    DELETE FROM user_active_sessions 
    WHERE is_active = FALSE 
    AND last_activity < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO authenticated;
GRANT SELECT ON user_login_history TO authenticated;
GRANT SELECT, UPDATE ON user_active_sessions TO authenticated;

-- Grant service role full access
GRANT ALL ON user_subscriptions TO service_role;
GRANT ALL ON user_login_history TO service_role;
GRANT ALL ON user_active_sessions TO service_role;