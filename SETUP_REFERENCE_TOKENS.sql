-- Reference Token System Setup (SaaS Industry Standard)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/[your-project]/sql

-- 1. Create user_sessions table for reference tokens
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  user_data jsonb NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Create performance indexes
CREATE INDEX IF NOT EXISTS user_sessions_token_hash_idx ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at);

-- 3. Create cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM user_sessions WHERE expires_at < now();
$$;

-- 4. Enable Row Level Security (optional but recommended)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policy (users can only access their own sessions)
CREATE POLICY "Users can only access their own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 6. Grant necessary permissions
GRANT ALL ON user_sessions TO authenticated;
GRANT ALL ON user_sessions TO service_role;

-- ✅ Setup complete! You should see:
-- - user_sessions table created
-- - Indexes for fast token lookup
-- - Cleanup function for expired sessions
-- - RLS policies for security

-- 🎯 Benefits:
-- • 32 character tokens instead of 738 character JWTs
-- • 95% size reduction 
-- • Industry standard pattern (Stripe, GitHub)
-- • No header size limits
-- • Instant token revocation

-- 🚀 Next steps:
-- 1. This SQL creates the foundation
-- 2. Your backend code will automatically use this table
-- 3. Frontend will generate 32-char reference tokens
-- 4. Authentication will work within any header size limits

SELECT 'Reference token system setup complete! 🎉' as status;