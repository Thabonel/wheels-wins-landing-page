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

SELECT * FROM verify_rls_policies();
