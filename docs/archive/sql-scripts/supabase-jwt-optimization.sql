-- Supabase JWT Optimization Configuration
-- Run these commands in your Supabase SQL Editor to reduce JWT size

-- 1. Minimize user metadata storage
-- Remove unnecessary fields from auth.users that appear in JWT
UPDATE auth.users 
SET phone = NULL 
WHERE phone = '' OR phone IS NULL;

-- 2. Optimize app_metadata (only keep essential fields)
-- This requires manual review in Supabase Dashboard > Authentication > Users
-- Remove redundant fields like 'providers' array if 'provider' string exists

-- 3. Configure JWT claims (these require Supabase Dashboard settings)
-- Go to Supabase Dashboard > Settings > API > JWT Settings
-- Consider removing these claims if not essential:
-- - aal (Authentication Assurance Level)
-- - amr (Authentication Methods References) 
-- - is_anonymous (can be inferred)
-- - session_id (if not using session management)

-- 4. Custom hook to minimize JWT claims (advanced)
-- This is a PostgreSQL function that runs before JWT generation
-- WARNING: Only implement if you understand the security implications

CREATE OR REPLACE FUNCTION auth.jwt_claims_override(user_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  claims jsonb;
BEGIN
  -- Start with minimal essential claims only
  claims := jsonb_build_object(
    'sub', user_data->>'id',
    'email', user_data->>'email',
    'role', COALESCE(user_data->'app_metadata'->>'role', 'authenticated'),
    'exp', extract(epoch from now() + interval '1 hour')::int,
    'iat', extract(epoch from now())::int
  );
  
  -- Only add session_id if it exists and is needed
  IF user_data ? 'session_id' THEN
    claims := claims || jsonb_build_object('session_id', user_data->>'session_id');
  END IF;
  
  RETURN claims;
END;
$$;

-- 5. Enable the custom JWT claims (requires superuser or RLS policy)
-- This is typically done through Supabase Dashboard or support ticket

-- 6. Alternative: Create a reference token system
-- Instead of large JWTs, use short reference tokens
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  user_data jsonb NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at timestamp with time zone DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS user_sessions_token_hash_idx ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at);

-- Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM user_sessions WHERE expires_at < now();
$$;

-- Schedule cleanup (run via cron or Supabase Edge Functions)
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions();');