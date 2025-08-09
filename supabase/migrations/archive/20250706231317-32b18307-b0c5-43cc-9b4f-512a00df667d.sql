-- Fix Supabase security warnings and suggestions (corrected)

-- 1. Enable RLS only on actual tables (not views)
ALTER TABLE public.location_venue_density ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.hustle_opportunities ENABLE ROW LEVEL SECURITY;

-- 2. Add missing RLS policies
CREATE POLICY "Public read access to location venue density" 
ON public.location_venue_density FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own hustle opportunities" 
ON public.hustle_opportunities FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Add performance indexes on frequently queried columns
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

-- 4. Update security functions with proper search paths
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

-- 5. Set proper function permissions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- 6. Add email validation for data integrity
ALTER TABLE public.profiles ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');