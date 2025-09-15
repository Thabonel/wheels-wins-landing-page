-- Fix Supabase linter warnings: Function Search Path Mutable
-- Adding SET search_path TO '' for security to prevent search path injection attacks

-- Fix update_income_entries_updated_at function
CREATE OR REPLACE FUNCTION public.update_income_entries_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_user_feedback_updated_at function
CREATE OR REPLACE FUNCTION public.update_user_feedback_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_trip_templates_updated_at function
CREATE OR REPLACE FUNCTION public.update_trip_templates_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix get_or_create_pam_conversation function (main version)
CREATE OR REPLACE FUNCTION public.get_or_create_pam_conversation(user_id uuid)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  INSERT INTO public.pam_conversations (user_id)
  VALUES (user_id)
  ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
  RETURNING pam_conversations.id, pam_conversations.created_at, pam_conversations.updated_at;
END;
$function$;