-- =====================================================
-- COMPREHENSIVE SECURITY AUDIT FOR SUPABASE DATABASE
-- =====================================================
-- Purpose: Identify specific security issues that caused F-grade rating
-- Run this in Supabase SQL Editor to diagnose security problems
-- Date: February 21, 2026
-- =====================================================

-- =====================================================
-- AUDIT 1: TABLES WITHOUT ROW LEVEL SECURITY
-- =====================================================
-- Critical: Tables without RLS are fully accessible to all roles
SELECT
    'CRITICAL: Tables without RLS' as issue_type,
    'MISSING_RLS' as issue_code,
    schemaname,
    tablename,
    'Tables without RLS allow unrestricted access' as description,
    CASE
        WHEN tablename IN ('profiles', 'expenses', 'trips', 'calendar_events')
        THEN 'CRITICAL'
        ELSE 'HIGH'
    END as severity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE c.relrowsecurity = true
    AND t.schemaname = 'public'
  )
  AND tablename NOT LIKE 'pg_%'
ORDER BY severity DESC, tablename;

-- =====================================================
-- AUDIT 2: OVERLY PERMISSIVE RLS POLICIES
-- =====================================================
-- Critical: Policies using USING (true) allow unrestricted access
SELECT
    'CRITICAL: Overly Permissive Policies' as issue_type,
    'PERMISSIVE_POLICY' as issue_code,
    schemaname,
    tablename,
    policyname,
    pol.cmd as command,
    qual as using_clause,
    with_check,
    'Policy allows unrestricted access with USING (true)' as description,
    'CRITICAL' as severity
FROM pg_policies pol
WHERE schemaname = 'public'
  AND (
    qual = 'true'  -- USING (true)
    OR qual ILIKE '%true%'
    OR with_check = 'true'  -- WITH CHECK (true)
    OR with_check ILIKE '%true%'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- AUDIT 3: ADMIN ROLE OVER-PRIVILEGED ACCESS
-- =====================================================
-- High: Check if admin role has excessive permissions
SELECT
    'HIGH: Admin Over-Privileges' as issue_type,
    'ADMIN_OVERPRIVILEGED' as issue_code,
    schemaname,
    tablename,
    policyname,
    roles,
    qual as using_clause,
    'Admin policies may grant excessive access' as description,
    'HIGH' as severity
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    policyname ILIKE '%admin%'
    OR qual ILIKE '%admin%'
    OR with_check ILIKE '%admin%'
    OR roles::text ILIKE '%admin%'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- AUDIT 4: MISSING COLUMN-LEVEL SECURITY
-- =====================================================
-- Medium: Sensitive columns without specific protection
SELECT
    'MEDIUM: Sensitive Data Exposure' as issue_type,
    'SENSITIVE_COLUMNS' as issue_code,
    table_schema,
    table_name,
    column_name,
    data_type,
    'Potentially sensitive column without specific protection' as description,
    CASE
        WHEN column_name ILIKE '%password%' OR column_name ILIKE '%secret%' OR column_name ILIKE '%key%'
        THEN 'HIGH'
        WHEN column_name ILIKE '%email%' OR column_name ILIKE '%phone%' OR column_name ILIKE '%ssn%'
        THEN 'MEDIUM'
        ELSE 'LOW'
    END as severity
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name ILIKE '%password%'
    OR column_name ILIKE '%secret%'
    OR column_name ILIKE '%key%'
    OR column_name ILIKE '%token%'
    OR column_name ILIKE '%email%'
    OR column_name ILIKE '%phone%'
    OR column_name ILIKE '%ssn%'
    OR column_name ILIKE '%credit%'
    OR column_name ILIKE '%card%'
    OR column_name ILIKE '%medical%'
  )
  AND table_name NOT LIKE 'pg_%'
ORDER BY severity DESC, table_name, column_name;

-- =====================================================
-- AUDIT 5: BROAD GRANT PERMISSIONS
-- =====================================================
-- High: Check for overly broad table permissions
SELECT
    'HIGH: Overly Broad Grants' as issue_type,
    'BROAD_GRANTS' as issue_code,
    schemaname,
    tablename,
    privilege_type,
    grantee,
    'Broad permissions granted to roles' as description,
    CASE
        WHEN privilege_type IN ('DELETE', 'TRUNCATE') AND grantee IN ('authenticated', 'anon')
        THEN 'CRITICAL'
        WHEN privilege_type = 'SELECT' AND grantee = 'anon'
        THEN 'HIGH'
        ELSE 'MEDIUM'
    END as severity
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee IN ('authenticated', 'anon', 'public')
  AND table_name NOT LIKE 'pg_%'
ORDER BY severity DESC, schemaname, tablename, privilege_type;

-- =====================================================
-- AUDIT 6: FUNCTIONS WITH SECURITY DEFINER
-- =====================================================
-- Critical: Functions running with elevated privileges
SELECT
    'CRITICAL: Elevated Privilege Functions' as issue_type,
    'SECURITY_DEFINER' as issue_code,
    routine_schema,
    routine_name,
    security_type,
    routine_definition,
    'Function runs with elevated privileges - potential privilege escalation' as description,
    CASE
        WHEN security_type = 'DEFINER' AND routine_definition ILIKE '%admin%'
        THEN 'CRITICAL'
        WHEN security_type = 'DEFINER'
        THEN 'HIGH'
        ELSE 'MEDIUM'
    END as severity
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND security_type = 'DEFINER'
ORDER BY severity DESC;

-- =====================================================
-- AUDIT 7: ANONYMOUS ACCESS TO SENSITIVE DATA
-- =====================================================
-- Critical: Check if anonymous users can access sensitive data
SELECT
    'CRITICAL: Anonymous Access to Sensitive Data' as issue_type,
    'ANON_SENSITIVE_ACCESS' as issue_code,
    schemaname,
    tablename,
    policyname,
    roles,
    'Anonymous users may access sensitive data' as description,
    'CRITICAL' as severity
FROM pg_policies
WHERE schemaname = 'public'
  AND roles::text ILIKE '%anon%'
  AND tablename IN (
    'profiles', 'expenses', 'medical_records', 'medical_medications',
    'medical_emergency_info', 'pam_conversations', 'pam_messages',
    'user_settings', 'fuel_log', 'maintenance_records'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- AUDIT 8: CROSS-USER DATA ACCESS RISKS
-- =====================================================
-- High: Policies that might allow cross-user data access
SELECT
    'HIGH: Potential Cross-User Access' as issue_type,
    'CROSS_USER_ACCESS' as issue_code,
    schemaname,
    tablename,
    policyname,
    qual as using_clause,
    with_check,
    'Policy may allow access to other users data' as description,
    'HIGH' as severity
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'expenses', 'trips', 'calendar_events', 'medical_records')
  AND (
    qual NOT ILIKE '%auth.uid()%'
    OR qual NOT ILIKE '%user_id%'
    OR qual = 'true'
  )
  AND policyname NOT ILIKE '%admin%'
ORDER BY tablename, policyname;

-- =====================================================
-- AUDIT 9: INFORMATION DISCLOSURE THROUGH SCHEMA
-- =====================================================
-- Medium: Check for information disclosure risks
SELECT
    'MEDIUM: Schema Information Disclosure' as issue_type,
    'SCHEMA_DISCLOSURE' as issue_code,
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    'Database schema may be exposed to unauthorized users' as description,
    'MEDIUM' as severity
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    SELECT table_name
    FROM information_schema.table_privileges
    WHERE grantee IN ('anon', 'authenticated')
    AND privilege_type = 'SELECT'
    AND table_schema = 'public'
  )
  AND table_name NOT LIKE 'pg_%'
ORDER BY table_name, ordinal_position
LIMIT 20;  -- Limit to prevent excessive output

-- =====================================================
-- AUDIT 10: MISSING AUDIT TRAILS
-- =====================================================
-- Medium: Tables without proper audit/timestamp columns
SELECT
    'MEDIUM: Missing Audit Trail' as issue_type,
    'NO_AUDIT_TRAIL' as issue_code,
    schemaname,
    tablename,
    'Table lacks audit trail columns (created_at, updated_at)' as description,
    CASE
        WHEN tablename IN ('profiles', 'expenses', 'medical_records')
        THEN 'HIGH'
        ELSE 'MEDIUM'
    END as severity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT IN (
    SELECT t.tablename
    FROM pg_tables t
    JOIN information_schema.columns c ON c.table_name = t.tablename
    WHERE c.table_schema = 'public'
    AND c.column_name IN ('created_at', 'updated_at')
    AND t.schemaname = 'public'
  )
ORDER BY severity DESC, tablename;

-- =====================================================
-- AUDIT 11: ROLE PRIVILEGE ESCALATION RISKS
-- =====================================================
-- Critical: Check for role privilege escalation possibilities
SELECT
    'CRITICAL: Role Privilege Escalation' as issue_type,
    'ROLE_ESCALATION' as issue_code,
    rolname,
    rolsuper,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    'Role has excessive privileges that could lead to escalation' as description,
    CASE
        WHEN rolsuper = true THEN 'CRITICAL'
        WHEN rolcreaterole = true OR rolcreatedb = true THEN 'HIGH'
        ELSE 'MEDIUM'
    END as severity
FROM pg_roles
WHERE rolname IN ('authenticated', 'anon', 'admin', 'service_role')
ORDER BY severity DESC;

-- =====================================================
-- AUDIT 12: SUMMARY OF SECURITY ISSUES FOUND
-- =====================================================
-- Generate a summary count of issues by type and severity
WITH security_issues AS (
    -- Combine all the above queries into a summary
    SELECT 'Tables without RLS' as category, COUNT(*) as count, 'CRITICAL' as max_severity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN (
        SELECT tablename
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE c.relrowsecurity = true
        AND t.schemaname = 'public'
      )
      AND tablename NOT LIKE 'pg_%'

    UNION ALL

    SELECT 'Overly Permissive Policies' as category, COUNT(*) as count, 'CRITICAL' as max_severity
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual = 'true' OR qual ILIKE '%true%' OR with_check = 'true' OR with_check ILIKE '%true%')

    UNION ALL

    SELECT 'Admin Over-Privileges' as category, COUNT(*) as count, 'HIGH' as max_severity
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (policyname ILIKE '%admin%' OR qual ILIKE '%admin%' OR with_check ILIKE '%admin%')

    UNION ALL

    SELECT 'Broad Grant Permissions' as category, COUNT(*) as count, 'HIGH' as max_severity
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND grantee IN ('authenticated', 'anon', 'public')
      AND table_name NOT LIKE 'pg_%'

    UNION ALL

    SELECT 'Anonymous Sensitive Access' as category, COUNT(*) as count, 'CRITICAL' as max_severity
    FROM pg_policies
    WHERE schemaname = 'public'
      AND roles::text ILIKE '%anon%'
      AND tablename IN ('profiles', 'expenses', 'medical_records', 'pam_conversations')
)
SELECT
    '=== SECURITY AUDIT SUMMARY ===' as section,
    category,
    count as issues_found,
    max_severity,
    CASE
        WHEN count > 0 AND max_severity = 'CRITICAL' THEN '🔴 IMMEDIATE ACTION REQUIRED'
        WHEN count > 0 AND max_severity = 'HIGH' THEN '🟠 HIGH PRIORITY'
        WHEN count > 0 THEN '🟡 MEDIUM PRIORITY'
        ELSE '✅ NO ISSUES FOUND'
    END as action_required
FROM security_issues
ORDER BY
    CASE max_severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        ELSE 3
    END,
    count DESC;

-- =====================================================
-- FINAL RECOMMENDATIONS
-- =====================================================
SELECT
    '=== IMMEDIATE SECURITY ACTIONS REQUIRED ===' as recommendations,
    '1. Review and fix all tables without RLS' as step_1,
    '2. Replace USING (true) policies with proper auth checks' as step_2,
    '3. Limit admin role access to necessary tables only' as step_3,
    '4. Remove anonymous access to sensitive data' as step_4,
    '5. Implement proper audit logging' as step_5,
    '6. Apply principle of least privilege' as step_6;