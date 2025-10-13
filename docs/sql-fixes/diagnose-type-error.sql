-- Diagnostic SQL to identify bigint = uuid type error
-- Run each section separately in Supabase SQL Editor

-- ============================================================================
-- SECTION 1: Examine pg_tables column types
-- ============================================================================
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'pg_catalog'
  AND table_name = 'pg_tables'
ORDER BY ordinal_position;

-- ============================================================================
-- SECTION 2: Examine pg_policies column types
-- ============================================================================
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'pg_catalog'
  AND table_name = 'pg_policies'
ORDER BY ordinal_position;

-- ============================================================================
-- SECTION 3: Test simple join without filters
-- ============================================================================
SELECT
    t.tablename,
    t.schemaname,
    p.tablename as policy_table,
    p.schemaname as policy_schema,
    pg_typeof(t.tablename) as t_tablename_type,
    pg_typeof(p.tablename) as p_tablename_type
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
LIMIT 5;

-- ============================================================================
-- SECTION 4: Check if any columns are being compared as bigint vs uuid
-- ============================================================================
SELECT
    t.oid,
    t.tablename,
    pg_typeof(t.oid) as oid_type,
    t.schemaname
FROM pg_tables t
WHERE t.schemaname = 'public'
LIMIT 5;

-- ============================================================================
-- SECTION 5: Safer RLS policy check using explicit casts
-- ============================================================================
DROP FUNCTION IF EXISTS verify_rls_policies_fixed() CASCADE;

CREATE OR REPLACE FUNCTION verify_rls_policies_fixed()
RETURNS TABLE(
    table_name text,
    rls_enabled text,
    policy_count bigint,
    status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tables.tablename::text as table_name,
        CASE
            WHEN tables.rowsecurity THEN '✅ ENABLED'
            ELSE '❌ DISABLED'
        END as rls_enabled,
        COALESCE(policy_stats.policy_count, 0::bigint) as policy_count,
        CASE
            WHEN NOT tables.rowsecurity THEN '🚨 CRITICAL: RLS NOT ENABLED'
            WHEN COALESCE(policy_stats.policy_count, 0) = 0 THEN '🚨 CRITICAL: NO POLICIES (lockout!)'
            WHEN COALESCE(policy_stats.policy_count, 0) < 2 THEN '⚠️ WARNING: Only ' || COALESCE(policy_stats.policy_count, 0)::text || ' policy'
            ELSE '✅ OK: ' || COALESCE(policy_stats.policy_count, 0)::text || ' policies'
        END as status
    FROM pg_tables tables
    LEFT JOIN (
        SELECT
            schemaname,
            tablename,
            COUNT(*)::bigint as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY schemaname, tablename
    ) policy_stats ON tables.tablename = policy_stats.tablename
                  AND tables.schemaname = policy_stats.schemaname
    WHERE tables.schemaname = 'public'
      AND tables.tablename IN (
          'profiles',
          'user_settings',
          'pam_conversations',
          'pam_messages',
          'expenses',
          'budgets',
          'trips'
      )
    ORDER BY
        CASE
            WHEN NOT tables.rowsecurity OR COALESCE(policy_stats.policy_count, 0) = 0 THEN 1
            WHEN COALESCE(policy_stats.policy_count, 0) < 2 THEN 2
            ELSE 3
        END,
        tables.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- Test the fixed function
SELECT * FROM verify_rls_policies_fixed();
