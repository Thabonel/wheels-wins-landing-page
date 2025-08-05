-- Fix permissions for agent_logs table to allow authenticated users to read
-- This fixes the 403 permission denied error

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own agent logs" ON public.agent_logs;
DROP POLICY IF EXISTS "Service role can insert agent logs" ON public.agent_logs;
DROP POLICY IF EXISTS "Service role can read all agent logs" ON public.agent_logs;

-- Create new policies with proper permissions

-- Allow authenticated users to read agent logs (for admin dashboard)
CREATE POLICY "Authenticated users can read agent logs" ON public.agent_logs
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert logs (for PAM interactions)
CREATE POLICY "Authenticated users can insert agent logs" ON public.agent_logs
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Users can only see their own logs (for non-admin users)
CREATE POLICY "Users can view own agent logs" ON public.agent_logs
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Allow service role full access (for backend operations)
CREATE POLICY "Service role full access" ON public.agent_logs
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');