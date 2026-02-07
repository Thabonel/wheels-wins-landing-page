-- PAM Database RLS Diagnostic
-- Checks table existence, RLS status, policies, and grants for all PAM-related tables

-- Query 1: Table existence and RLS status
SELECT
  t.table_name,
  CASE WHEN c.relname IS NOT NULL THEN true ELSE false END AS table_exists,
  COALESCE(c.relrowsecurity, false) AS rls_enabled,
  COALESCE(c.relforcerowsecurity, false) AS rls_forced
FROM (
  VALUES
    ('user_trips'), ('vehicles'), ('calendar_events'), ('expenses'), ('budgets'),
    ('pam_savings_events'), ('fuel_log'), ('maintenance_records'),
    ('posts'), ('comments'), ('post_likes'), ('messages'), ('user_follows'),
    ('shared_locations'), ('events'), ('event_attendees'), ('profiles'),
    ('meal_plans'), ('pantry_items'), ('recipes'), ('shopping_lists'),
    ('favorite_locations'), ('shakedown_trips'), ('shakedown_issues'),
    ('transition_equipment'), ('user_launch_tasks'), ('transition_tasks'),
    ('community_tips'), ('tip_usage_log'), ('community_knowledge'),
    ('pam_admin_knowledge'), ('pam_knowledge_usage_log'),
    ('timers_and_alarms'), ('user_settings')
) AS t(table_name)
LEFT JOIN pg_class c ON c.relname = t.table_name
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY t.table_name;

-- Query 2: RLS policies per table
SELECT
  p.tablename,
  p.policyname,
  p.cmd,
  p.roles,
  p.qual,
  p.with_check
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename IN (
    'user_trips', 'vehicles', 'calendar_events', 'expenses', 'budgets',
    'pam_savings_events', 'fuel_log', 'maintenance_records',
    'posts', 'comments', 'post_likes', 'messages', 'user_follows',
    'shared_locations', 'events', 'event_attendees', 'profiles',
    'meal_plans', 'pantry_items', 'recipes', 'shopping_lists',
    'favorite_locations', 'shakedown_trips', 'shakedown_issues',
    'transition_equipment', 'user_launch_tasks', 'transition_tasks',
    'community_tips', 'tip_usage_log', 'community_knowledge',
    'pam_admin_knowledge', 'pam_knowledge_usage_log',
    'timers_and_alarms', 'user_settings'
  )
ORDER BY p.tablename, p.policyname;

-- Query 3: Grants for authenticated, service_role, and anon
SELECT
  tp.table_name,
  tp.grantee,
  tp.privilege_type
FROM information_schema.table_privileges tp
WHERE tp.table_schema = 'public'
  AND tp.table_name IN (
    'user_trips', 'vehicles', 'calendar_events', 'expenses', 'budgets',
    'pam_savings_events', 'fuel_log', 'maintenance_records',
    'posts', 'comments', 'post_likes', 'messages', 'user_follows',
    'shared_locations', 'events', 'event_attendees', 'profiles',
    'meal_plans', 'pantry_items', 'recipes', 'shopping_lists',
    'favorite_locations', 'shakedown_trips', 'shakedown_issues',
    'transition_equipment', 'user_launch_tasks', 'transition_tasks',
    'community_tips', 'tip_usage_log', 'community_knowledge',
    'pam_admin_knowledge', 'pam_knowledge_usage_log',
    'timers_and_alarms', 'user_settings'
  )
  AND tp.grantee IN ('authenticated', 'service_role', 'anon')
ORDER BY tp.table_name, tp.grantee, tp.privilege_type;
