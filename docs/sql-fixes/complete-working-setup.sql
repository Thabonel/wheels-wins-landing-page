DROP VIEW IF EXISTS signup_health_check CASCADE;

CREATE VIEW signup_health_check AS
SELECT
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as signups_last_hour,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '6 hours') as signups_last_6h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as signups_last_24h,
    MAX(created_at) as last_signup_time,
    EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 as hours_since_last_signup,
    CASE
        WHEN MAX(created_at) IS NULL THEN '🚨 CRITICAL: NO SIGNUPS EVER'
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 > 24 THEN '🚨 CRITICAL: No signups in 24+ hours'
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 > 12 THEN '⚠️ WARNING: No signups in 12+ hours'
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 > 6 THEN '⚡ NOTICE: No signups in 6+ hours'
        ELSE '✅ OK: Recent signup activity'
    END as health_status
FROM auth.users;

DROP FUNCTION IF EXISTS verify_security_definer_functions() CASCADE;

CREATE FUNCTION verify_security_definer_functions()
RETURNS TABLE(
    function_name text,
    has_security_definer text,
    has_search_path text,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        proname::text as function_name,
        CASE WHEN prosecdef THEN '✅ YES' ELSE '❌ NO' END as has_security_definer,
        CASE WHEN proconfig IS NOT NULL AND array_to_string(proconfig, ',') LIKE '%search_path%' THEN '✅ YES' ELSE '❌ NO' END as has_search_path,
        CASE
            WHEN prosecdef AND proconfig IS NOT NULL AND array_to_string(proconfig, ',') LIKE '%search_path%' THEN '✅ SECURE'
            WHEN NOT prosecdef THEN '⚠️ MISSING SECURITY DEFINER'
            WHEN proconfig IS NULL OR array_to_string(proconfig, ',') NOT LIKE '%search_path%' THEN '⚠️ MISSING search_path'
            ELSE '❌ INSECURE'
        END as status
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname IN ('update_updated_at_column', 'handle_new_user', 'notify_new_signup', 'queue_admin_notification');
END;
$$;

DROP FUNCTION IF EXISTS verify_rls_policies() CASCADE;

CREATE FUNCTION verify_rls_policies()
RETURNS TABLE(
    table_name text,
    rls_enabled text,
    policy_count bigint,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RETURN QUERY
    WITH table_list AS (
        SELECT 'profiles'::name AS tbl
        UNION ALL SELECT 'user_settings'::name
        UNION ALL SELECT 'pam_conversations'::name
        UNION ALL SELECT 'pam_messages'::name
        UNION ALL SELECT 'expenses'::name
        UNION ALL SELECT 'budgets'::name
        UNION ALL SELECT 'trips'::name
    ),
    table_info AS (
        SELECT
            tl.tbl::text as table_name,
            COALESCE(t.rowsecurity, false) as has_rls
        FROM table_list tl
        LEFT JOIN pg_tables t ON t.tablename = tl.tbl AND t.schemaname = 'public'
    ),
    policy_counts AS (
        SELECT
            p.tablename::text as table_name,
            COUNT(*)::bigint as num_policies
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        GROUP BY p.tablename::text
    )
    SELECT
        ti.table_name,
        CASE WHEN ti.has_rls THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_enabled,
        COALESCE(pc.num_policies, 0::bigint) as policy_count,
        CASE
            WHEN NOT ti.has_rls THEN '🚨 CRITICAL: RLS NOT ENABLED'
            WHEN COALESCE(pc.num_policies, 0) = 0 THEN '🚨 CRITICAL: NO POLICIES (lockout!)'
            WHEN COALESCE(pc.num_policies, 0) < 2 THEN '⚠️ WARNING: Only ' || COALESCE(pc.num_policies, 0)::text || ' policy'
            ELSE '✅ OK: ' || COALESCE(pc.num_policies, 0)::text || ' policies'
        END as status
    FROM table_info ti
    LEFT JOIN policy_counts pc ON ti.table_name = pc.table_name
    ORDER BY
        CASE
            WHEN NOT ti.has_rls OR COALESCE(pc.num_policies, 0) = 0 THEN 1
            WHEN COALESCE(pc.num_policies, 0) < 2 THEN 2
            ELSE 3
        END,
        ti.table_name;
END;
$$;

DROP FUNCTION IF EXISTS basic_health_check() CASCADE;

CREATE FUNCTION basic_health_check()
RETURNS TABLE(
    check_category text,
    check_name text,
    status text,
    details text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_signups_24h bigint;
    v_last_signup timestamptz;
    v_total_functions bigint;
    v_secure_functions bigint;
    v_total_tables bigint;
    v_critical_tables bigint;
    v_warning_tables bigint;
    v_ok_tables bigint;
BEGIN
    SELECT COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'), MAX(created_at)
    INTO v_signups_24h, v_last_signup
    FROM auth.users;

    RETURN QUERY
    SELECT
        'Signup Health'::text,
        'Last 24h Signups'::text,
        CASE WHEN v_signups_24h = 0 THEN '🚨 CRITICAL' WHEN v_signups_24h < 5 THEN '⚠️ WARNING' ELSE '✅ OK' END,
        v_signups_24h::text || ' signups, last: ' || COALESCE(TO_CHAR(v_last_signup, 'YYYY-MM-DD HH24:MI'), 'NEVER');

    SELECT COUNT(*), COUNT(*) FILTER (WHERE status LIKE '%SECURE%')
    INTO v_total_functions, v_secure_functions
    FROM verify_security_definer_functions();

    RETURN QUERY
    SELECT
        'Security'::text,
        'SECURITY DEFINER Functions'::text,
        CASE WHEN v_secure_functions = v_total_functions THEN '✅ OK' ELSE '🚨 CRITICAL' END,
        v_secure_functions::text || '/' || v_total_functions::text || ' secure';

    SELECT COUNT(*), COUNT(*) FILTER (WHERE status LIKE '🚨%'), COUNT(*) FILTER (WHERE status LIKE '⚠️%'), COUNT(*) FILTER (WHERE status LIKE '✅%')
    INTO v_total_tables, v_critical_tables, v_warning_tables, v_ok_tables
    FROM verify_rls_policies();

    RETURN QUERY
    SELECT
        'Security'::text,
        'RLS Policies'::text,
        CASE WHEN v_critical_tables > 0 THEN '🚨 CRITICAL' WHEN v_warning_tables > 0 THEN '⚠️ WARNING' ELSE '✅ OK' END,
        v_ok_tables::text || '/' || v_total_tables::text || ' tables OK';

    RETURN;
END;
$$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON signup_health_check TO authenticated;
GRANT EXECUTE ON FUNCTION verify_security_definer_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION basic_health_check() TO authenticated;
