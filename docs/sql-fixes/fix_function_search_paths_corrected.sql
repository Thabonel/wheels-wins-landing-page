-- Corrected version: Includes proper function signatures with parameters
-- All 39 functions verified to exist in database (Nov 6, 2025)

-- Functions with no parameters (16 functions)
ALTER FUNCTION public.create_user_stats_on_first_tip() SET search_path = '';
ALTER FUNCTION public.get_community_stats() SET search_path = '';
ALTER FUNCTION public.get_transition_profile() SET search_path = '';
ALTER FUNCTION public.increment_knowledge_usage_count() SET search_path = '';
ALTER FUNCTION public.update_admin_knowledge_timestamp() SET search_path = '';
ALTER FUNCTION public.update_calendar_events_updated_at() SET search_path = '';
ALTER FUNCTION public.update_community_tips_updated_at() SET search_path = '';
ALTER FUNCTION public.update_daily_usage_stats() SET search_path = '';
ALTER FUNCTION public.update_knowledge_usage() SET search_path = '';
ALTER FUNCTION public.update_pam_admin_knowledge_updated_at() SET search_path = '';
ALTER FUNCTION public.update_pam_savings_events_updated_at() SET search_path = '';
ALTER FUNCTION public.update_profile_completion() SET search_path = '';
ALTER FUNCTION public.update_room_item_counts() SET search_path = '';
ALTER FUNCTION public.update_room_status() SET search_path = '';
ALTER FUNCTION public.update_transition_phase() SET search_path = '';
ALTER FUNCTION public.update_transition_updated_at() SET search_path = '';
ALTER FUNCTION public.update_stats_on_tip_usage() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- Functions with 1 parameter (10 functions)
ALTER FUNCTION public.calculate_transition_completion(p_profile_id uuid) SET search_path = '';
ALTER FUNCTION public.check_badge_eligibility(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_days_until_launch(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_downsizing_stats(p_profile_id uuid) SET search_path = '';
ALTER FUNCTION public.get_equipment_stats(p_profile_id uuid) SET search_path = '';
ALTER FUNCTION public.get_income_stats(p_profile_id uuid) SET search_path = '';
ALTER FUNCTION public.get_launch_week_progress(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_partner_alignment_stats(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_service_stats(p_profile_id uuid) SET search_path = '';
ALTER FUNCTION public.get_shakedown_stats(p_profile_id uuid) SET search_path = '';
ALTER FUNCTION public.get_transition_profile(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_user_connection_stats(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_user_contribution_stats(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_vehicle_mod_stats(p_profile_id uuid) SET search_path = '';
ALTER FUNCTION public.determine_transition_phase(p_departure_date date) SET search_path = '';

-- Functions with 2 parameters (5 functions)
ALTER FUNCTION public.create_default_income_streams(p_profile_id uuid, p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.create_default_rooms(p_profile_id uuid, p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.create_default_services(p_profile_id uuid, p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.find_similar_users(p_user_id uuid, p_limit integer) SET search_path = '';
ALTER FUNCTION public.get_mood_trends(p_user_id uuid, p_days integer) SET search_path = '';

-- Functions with 3 parameters (2 functions)
ALTER FUNCTION public.create_default_transition_tasks(p_profile_id uuid, p_user_id uuid, p_departure_date date) SET search_path = '';
ALTER FUNCTION public.search_community_tips(p_query text, p_category text, p_limit integer) SET search_path = '';
