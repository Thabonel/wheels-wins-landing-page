-- Final Security Fix for Both Views
-- Recreates views with SECURITY INVOKER instead of SECURITY DEFINER
-- This fixes all 3 Supabase security linter warnings

-- =============================================================================
-- Fix 1: signup_health_check view
-- Changes: SECURITY DEFINER → SECURITY INVOKER, anon → authenticated only
-- =============================================================================

DROP VIEW IF EXISTS public.signup_health_check CASCADE;

CREATE VIEW public.signup_health_check
WITH (security_invoker = true)  -- Use caller's permissions, not definer's
AS
SELECT
    count(*) FILTER (WHERE created_at > now() - interval '1 hour') AS signups_last_hour,
    count(*) FILTER (WHERE created_at > now() - interval '6 hours') AS signups_last_6h,
    count(*) FILTER (WHERE created_at > now() - interval '24 hours') AS signups_last_24h,
    max(created_at) AS last_signup_time,
    extract(epoch FROM now() - max(created_at)) / 3600 AS hours_since_last_signup,
    CASE
        WHEN max(created_at) IS NULL THEN '🚨 CRITICAL: NO SIGNUPS EVER'
        WHEN extract(epoch FROM now() - max(created_at)) / 3600 > 24 THEN '🚨 CRITICAL: No signups in 24+ hours'
        WHEN extract(epoch FROM now() - max(created_at)) / 3600 > 12 THEN '⚠️ WARNING: No signups in 12+ hours'
        WHEN extract(epoch FROM now() - max(created_at)) / 3600 > 6 THEN '⚡ NOTICE: No signups in 6+ hours'
        ELSE '✅ OK: Recent signup activity'
    END AS health_status
FROM auth.users;

-- Grant to authenticated users only (more secure than anon)
GRANT SELECT ON public.signup_health_check TO authenticated;

-- Revoke from anon if previously granted
REVOKE ALL ON public.signup_health_check FROM anon;


-- =============================================================================
-- Fix 2: budget_utilization view
-- Changes: SECURITY DEFINER → SECURITY INVOKER
-- =============================================================================

DROP VIEW IF EXISTS public.budget_utilization CASCADE;

CREATE VIEW public.budget_utilization
WITH (security_invoker = true)  -- Use caller's permissions, not definer's
AS
SELECT
    b.id,
    b.user_id,
    b.category,
    b.budgeted_amount AS budget_amount,
    COALESCE(SUM(e.amount), 0) AS spent_amount,
    b.budgeted_amount - COALESCE(SUM(e.amount), 0) AS remaining_amount,
    CASE
        WHEN b.budgeted_amount > 0 THEN (COALESCE(SUM(e.amount), 0) / b.budgeted_amount * 100)
        ELSE 0
    END AS utilization_percentage
FROM public.budgets b
LEFT JOIN public.expenses e ON
    e.user_id = b.user_id AND
    e.category = b.category AND
    e.date >= b.start_date AND
    (b.end_date IS NULL OR e.date <= b.end_date)
GROUP BY b.id, b.user_id, b.category, b.budgeted_amount;

-- Grant to authenticated users
GRANT SELECT ON public.budget_utilization TO authenticated;


-- =============================================================================
-- Verification
-- =============================================================================

-- Verify views were recreated
SELECT
    schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('signup_health_check', 'budget_utilization');

-- Verify no SECURITY DEFINER views remain
SELECT
    n.nspname as schema,
    c.relname as view_name,
    CASE
        WHEN pg_get_viewdef(c.oid, true) ILIKE '%security_invoker%' THEN 'SECURITY INVOKER ✅'
        WHEN pg_get_viewdef(c.oid, true) ILIKE '%security_definer%' THEN 'SECURITY DEFINER ❌'
        ELSE 'DEFAULT (INVOKER) ✅'
    END as security_mode
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
AND n.nspname = 'public'
AND c.relname IN ('signup_health_check', 'budget_utilization');

-- Check permissions
SELECT
    table_schema,
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('signup_health_check', 'budget_utilization')
ORDER BY table_name, grantee;
