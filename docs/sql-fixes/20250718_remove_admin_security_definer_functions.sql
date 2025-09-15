
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);
DROP FUNCTION IF EXISTS public.is_current_user_admin();
DROP FUNCTION IF EXISTS public.bootstrap_admin_user(TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

DROP POLICY IF EXISTS "Admins can manage admin_users via function" ON public.admin_users;
DROP POLICY IF EXISTS "Current user can view admin_users if they are admin" ON public.admin_users;
DROP POLICY IF EXISTS "Current user can manage admin_users if they are admin" ON public.admin_users;
DROP POLICY IF EXISTS "Current user can manage content_moderation if they are admin" ON public.content_moderation;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Admins can view all PAM analytics" ON public.pam_analytics_logs;

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

DROP POLICY IF EXISTS "Users manage own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_delete" ON public.calendar_events;

CREATE POLICY "calendar_events_select_policy" ON public.calendar_events 
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "calendar_events_insert_policy" ON public.calendar_events 
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "calendar_events_update_policy" ON public.calendar_events 
  FOR UPDATE USING (auth.uid()::uuid = user_id) WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "calendar_events_delete_policy" ON public.calendar_events 
  FOR DELETE USING (auth.uid()::uuid = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_is_admin(uuid) TO authenticated;

COMMENT ON TABLE public.calendar_events IS 
'Calendar events table with clean RLS policies. All SECURITY DEFINER functions removed to prevent "permission denied to set role admin" errors.';

COMMENT ON FUNCTION public.check_user_is_admin IS 
'Simple admin check function without SECURITY DEFINER to avoid role switching issues.';
