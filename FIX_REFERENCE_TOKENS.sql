-- Fix Reference Token System for Admin Users
-- Run this in your Supabase SQL Editor to resolve RLS permission issues

-- 1. Drop existing restrictive RLS policy
DROP POLICY IF EXISTS "Users can only access their own sessions" ON user_sessions;

-- 2. Create more permissive RLS policies for reference tokens
-- Allow authenticated users to insert their own sessions
CREATE POLICY "Users can insert their own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to select their own sessions  
CREATE POLICY "Users can select their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to delete their own sessions (for token revocation)
CREATE POLICY "Users can delete their own sessions" ON user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Alternative: Disable RLS temporarily for reference tokens
-- (Uncomment if the above policies still cause issues)
-- ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- 4. Verify the table exists and has correct structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_sessions') THEN
        -- Create the table if it doesn't exist
        CREATE TABLE user_sessions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
          token_hash text UNIQUE NOT NULL,
          user_data jsonb NOT NULL,
          expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
          created_at timestamp with time zone DEFAULT now()
        );

        -- Create indexes
        CREATE INDEX user_sessions_token_hash_idx ON user_sessions(token_hash);
        CREATE INDEX user_sessions_expires_at_idx ON user_sessions(expires_at);
        
        -- Grant permissions
        GRANT ALL ON user_sessions TO authenticated;
        GRANT ALL ON user_sessions TO service_role;
        
        RAISE NOTICE 'user_sessions table created successfully';
    ELSE
        RAISE NOTICE 'user_sessions table already exists';
    END IF;
END
$$;

-- 5. Test the setup
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_sessions')
    THEN '✅ user_sessions table exists'
    ELSE '❌ user_sessions table missing'
  END as table_status,
  
  CASE 
    WHEN EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_sessions')
    THEN '✅ RLS policies configured'
    ELSE '⚠️ No RLS policies found'
  END as rls_status;

-- 6. Show current policies
SELECT 
  pol.policyname as policy_name,
  pol.cmd as command,
  pol.permissive as permissive,
  pol.roles as roles
FROM pg_policies pol 
WHERE pol.schemaname = 'public' AND pol.tablename = 'user_sessions';

SELECT '🎉 Reference token system should now work for admin users!' as result;