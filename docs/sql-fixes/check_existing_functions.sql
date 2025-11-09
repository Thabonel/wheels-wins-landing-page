-- Diagnostic query: Check which functions from the linter warnings actually exist
-- Run this in Supabase SQL Editor to see what needs fixing

WITH target_functions AS (
    SELECT unnest(ARRAY[
        'update_daily_usage_stats',
        'update_knowledge_usage',
        'update_admin_knowledge_timestamp',
        'update_community_tips_updated_at',
        'create_user_stats_on_first_tip',
        'update_transition_updated_at',
        'update_stats_on_tip_usage',
        'calculate_transition_completion',
        'search_community_tips',
        'update_updated_at_column',
        'get_user_contribution_stats',
        'update_profile_completion',
        'determine_transition_phase',
        'update_transition_phase',
        'get_community_stats',
        'update_calendar_events_updated_at',
        'create_default_transition_tasks',
        'update_room_item_counts',
        'update_room_status',
        'create_default_rooms',
        'get_downsizing_stats',
        'create_default_services',
        'get_service_stats',
        'get_transition_profile',
        'create_default_income_streams',
        'get_income_stats',
        'get_vehicle_mod_stats',
        'get_equipment_stats',
        'get_shakedown_stats',
        'update_pam_admin_knowledge_updated_at',
        'increment_knowledge_usage_count',
        'update_pam_savings_events_updated_at',
        'find_similar_users',
        'get_user_connection_stats',
        'get_mood_trends',
        'check_badge_eligibility',
        'get_partner_alignment_stats',
        'get_launch_week_progress',
        'get_days_until_launch'
    ]) AS function_name
)
SELECT
    tf.function_name,
    CASE
        WHEN p.proname IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status,
    CASE
        WHEN p.proname IS NOT NULL THEN pg_get_function_identity_arguments(p.oid)
        ELSE NULL
    END as arguments
FROM target_functions tf
LEFT JOIN pg_proc p ON p.proname = tf.function_name
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
ORDER BY
    CASE WHEN p.proname IS NOT NULL THEN 0 ELSE 1 END,
    tf.function_name;
