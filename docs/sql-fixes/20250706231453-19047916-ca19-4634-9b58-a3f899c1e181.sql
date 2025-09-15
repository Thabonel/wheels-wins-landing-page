-- Fix critical Supabase security warnings (functions and permissions only)

-- 1. Update security functions with proper search paths to prevent injection attacks
CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role FROM public.profiles WHERE user_id = check_user_id LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = $1 
    AND role = 'admin' 
    AND status = 'active'
  );
$function$;

-- 2. Update all trigger functions to use secure search paths
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, region)
  VALUES (NEW.id, NEW.email, 'Australia')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 3. Restrict function permissions to appropriate roles only
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

REVOKE ALL ON FUNCTION public.bootstrap_admin_user(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_user(text, uuid) TO service_role;

-- 4. Add indexes only on confirmed tables (not views)
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(date);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

CREATE INDEX IF NOT EXISTS idx_fuel_log_user_id ON public.fuel_log(user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_date ON public.fuel_log(date);