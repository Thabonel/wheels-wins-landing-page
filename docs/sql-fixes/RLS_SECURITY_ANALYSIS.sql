-- RLS Security Analysis - Find Overly Permissive Policies
-- Date: January 31, 2026
-- Purpose: Identify policies using WITH CHECK (true) that bypass security

-- 1. Find all policies with overly permissive WITH CHECK expressions
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check,
    CASE
        WHEN with_check = 'true' THEN 'CRITICAL: Allows unrestricted access'
        WHEN with_check LIKE '%true%' THEN 'WARNING: May contain permissive check'
        ELSE 'OK'
    END as security_risk
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    with_check = 'true'
    OR with_check LIKE '%true%'
  )
ORDER BY
    CASE WHEN with_check = 'true' THEN 1 ELSE 2 END,
    tablename,
    policyname;

-- 2. Check specific tables mentioned in the security report
SELECT
    tablename,
    policyname,
    cmd,
    with_check,
    'SECURITY ISSUE: ' || policyname as issue
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations')
  AND with_check = 'true'
ORDER BY tablename;

-- 3. Check which roles these policies apply to
SELECT DISTINCT
    tablename,
    unnest(string_to_array(trim(both '{}' from roles::text), ',')) as role_name,
    count(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND with_check = 'true'
GROUP BY tablename, role_name
ORDER BY tablename;

-- 4. Get table ownership and RLS status
SELECT
    t.table_name,
    t.table_type,
    pc.relrowsecurity as rls_enabled,
    pc.relforcerowsecurity as rls_forced,
    po.rolname as owner
FROM information_schema.tables t
JOIN pg_class pc ON pc.relname = t.table_name
JOIN pg_roles po ON po.oid = pc.relowner
WHERE t.table_schema = 'public'
  AND t.table_name IN ('affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations')
ORDER BY t.table_name;

-- 5. Check current table structures for security context
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations')
  AND column_name IN ('user_id', 'id', 'created_at', 'created_by')
ORDER BY table_name, ordinal_position;