-- Diagnostic queries to understand the security issues
-- Run these to see what needs to be fixed

-- 1. Check signup_health_check view definition
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE viewname = 'signup_health_check';

-- 2. Check budget_utilization view definition
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE viewname = 'budget_utilization';

-- 3. Check if views use SECURITY DEFINER
SELECT
    n.nspname as schema,
    c.relname as view_name,
    CASE
        WHEN c.relkind = 'v' THEN 'view'
        WHEN c.relkind = 'm' THEN 'materialized view'
    END as view_type,
    pg_get_viewdef(c.oid, true) as definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('v', 'm')
AND n.nspname = 'public'
AND c.relname IN ('signup_health_check', 'budget_utilization');

-- 4. Check what auth.users columns are exposed
SELECT
    table_schema,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'auth'
AND table_name = 'users'
ORDER BY ordinal_position;
