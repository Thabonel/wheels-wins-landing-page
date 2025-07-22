-- Fix user_subscriptions policies that use problematic functions
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;

-- Create simple policies without problematic functions
-- First check the user_subscriptions table structure to see if user_id is integer or text
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions 
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own subscriptions" ON public.user_subscriptions 
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own subscriptions" ON public.user_subscriptions 
  FOR UPDATE USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- Fix user_sessions policies - user_id is likely text type based on the table
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can select their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;

CREATE POLICY "Users can insert their own sessions" ON public.user_sessions 
  FOR INSERT WITH CHECK (user_id::uuid = auth.uid());

CREATE POLICY "Users can select their own sessions" ON public.user_sessions 
  FOR SELECT USING (user_id::uuid = auth.uid());

CREATE POLICY "Users can delete their own sessions" ON public.user_sessions 
  FOR DELETE USING (user_id::uuid = auth.uid());

COMMENT ON TABLE public.user_sessions IS 
'User sessions table with clean RLS policies, no SECURITY DEFINER functions.';

COMMENT ON TABLE public.user_subscriptions IS 
'User subscriptions table with clean RLS policies, no SECURITY DEFINER functions.';