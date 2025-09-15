-- First drop all policies that depend on the problematic functions
DROP POLICY IF EXISTS "Admins can manage admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Service role can manage admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Public read access for admin checking" ON public.admin_users;
DROP POLICY IF EXISTS "Allow admin user creation" ON public.admin_users;
DROP POLICY IF EXISTS "Allow bootstrap admin creation when none exist" ON public.admin_users;

-- Now drop the problematic functions
DROP FUNCTION IF EXISTS public.is_admin_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_current_user_admin() CASCADE;
DROP FUNCTION IF EXISTS public.bootstrap_admin_user(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

-- Create a simple admin check function without SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.check_user_is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = check_user_id 
    AND role = 'admin' 
    AND status = 'active'
  );
$$;

-- Recreate safe admin_users policies without problematic functions
CREATE POLICY "Users can manage their own admin record" ON public.admin_users 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read access for admin checking" ON public.admin_users 
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage admin_users" ON public.admin_users 
  FOR ALL USING (true) WITH CHECK (true);

-- Fix calendar_events table - drop existing policies and recreate clean ones
DROP POLICY IF EXISTS "Users manage own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_select_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete_policy" ON public.calendar_events;

-- Create clean calendar_events policies using text conversion for user_id
CREATE POLICY "calendar_events_select_policy" ON public.calendar_events 
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "calendar_events_insert_policy" ON public.calendar_events 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "calendar_events_update_policy" ON public.calendar_events 
  FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "calendar_events_delete_policy" ON public.calendar_events 
  FOR DELETE USING (auth.uid()::text = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_is_admin(uuid) TO authenticated;

COMMENT ON TABLE public.calendar_events IS 
'Calendar events table with clean RLS policies. All SECURITY DEFINER functions removed to prevent "permission denied to set role admin" errors.';

COMMENT ON FUNCTION public.check_user_is_admin IS 
'Simple admin check function without SECURITY DEFINER to avoid role switching issues.';