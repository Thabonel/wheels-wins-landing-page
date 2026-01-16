-- FIX: Broken triggers on transition_tasks table
-- Issue: Checkboxes wouldn't tick, tasks couldn't be added
-- Root cause: Functions had SET search_path TO '' preventing table access
-- Date: 2025-01-17

-- Fix calculate_transition_completion function
CREATE OR REPLACE FUNCTION public.calculate_transition_completion(p_profile_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  percentage INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tasks
  FROM public.transition_tasks
  WHERE profile_id = p_profile_id;

  IF total_tasks = 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO completed_tasks
  FROM public.transition_tasks
  WHERE profile_id = p_profile_id AND is_completed = true;

  percentage := FLOOR((completed_tasks::DECIMAL / total_tasks::DECIMAL) * 100);

  RETURN percentage;
END;
$function$;

-- Fix update_profile_completion trigger function
CREATE OR REPLACE FUNCTION public.update_profile_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.transition_profiles
  SET completion_percentage = public.calculate_transition_completion(NEW.profile_id)
  WHERE id = NEW.profile_id;

  RETURN NEW;
END;
$function$;
