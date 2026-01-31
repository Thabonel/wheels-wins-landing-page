-- Analyze Table Structures for Security Policy Design
-- Date: January 31, 2026
-- Purpose: Understand table schemas to create precise RLS policies

-- 1. Check if these tables exist and get their structure
SELECT
    t.table_name,
    CASE WHEN t.table_name IS NULL THEN 'TABLE DOES NOT EXIST' ELSE 'EXISTS' END as table_status
FROM (
    VALUES
        ('affiliate_product_clicks'),
        ('agent_logs'),
        ('product_issue_reports'),
        ('trip_locations')
) AS tables(table_name)
LEFT JOIN information_schema.tables t ON t.table_name = tables.table_name AND t.table_schema = 'public';

-- 2. Get detailed column information for existing tables
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations')
  )
ORDER BY table_name, ordinal_position;

-- 3. Check current RLS policies on these tables
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations')
  )
ORDER BY tablename, policyname;

-- 4. Check if RLS is enabled on these tables
SELECT
    t.table_name,
    pc.relrowsecurity as rls_enabled,
    pc.relforcerowsecurity as rls_forced,
    po.rolname as table_owner
FROM information_schema.tables t
JOIN pg_class pc ON pc.relname = t.table_name AND pc.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
JOIN pg_roles po ON po.oid = pc.relowner
WHERE t.table_schema = 'public'
  AND t.table_name IN ('affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations');

-- 5. Look for any other tables with WITH CHECK (true) policies
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND with_check = 'true'
ORDER BY tablename, policyname;