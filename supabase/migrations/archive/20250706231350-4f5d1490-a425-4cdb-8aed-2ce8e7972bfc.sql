-- Fix Supabase security warnings (only real tables and functions)

-- 1. Add performance indexes on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_active_recommendations_user_id ON public.active_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_active_recommendations_expires_at ON public.active_recommendations(expires_at);

CREATE INDEX IF NOT EXISTS idx_agent_logs_user_id ON public.agent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON public.agent_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(date);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

CREATE INDEX IF NOT EXISTS idx_fuel_log_user_id ON public.fuel_log(user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_date ON public.fuel_log(date);

CREATE INDEX IF NOT EXISTS idx_food_items_user_id ON public.food_items(user_id);
CREATE INDEX IF NOT EXISTS idx_food_items_expiry_date ON public.food_items(expiry_date);

CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_author_id ON public.social_posts(author_id);

-- 2. Update security functions with proper search paths to prevent injection
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

-- 3. Update all trigger functions to use empty search path for security
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

-- 4. Set proper function permissions (restrict public access)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

REVOKE ALL ON FUNCTION public.bootstrap_admin_user(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_user(text, uuid) TO service_role;

-- 5. Add email validation constraint for data integrity
ALTER TABLE public.profiles 
ADD CONSTRAINT IF NOT EXISTS check_email_format 
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');