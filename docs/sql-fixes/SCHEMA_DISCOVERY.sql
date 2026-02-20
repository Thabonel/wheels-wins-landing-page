-- =====================================================
-- SCHEMA DISCOVERY - RUN THIS FIRST
-- =====================================================
-- Purpose: Discover actual database schema before applying fixes
-- Run in Supabase SQL Editor to understand current structure
-- Date: February 21, 2026
-- =====================================================

-- =====================================================
-- DISCOVERY 1: WHAT TABLES EXIST?
-- =====================================================
SELECT
    'EXISTING TABLES' as info_type,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;

-- =====================================================
-- DISCOVERY 2: WHAT COLUMNS EXIST IN KEY TABLES?
-- =====================================================
-- Check profiles table structure
SELECT
    'PROFILES TABLE COLUMNS' as info_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check if expenses table exists and its columns
SELECT
    'EXPENSES TABLE COLUMNS' as info_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'expenses'
ORDER BY ordinal_position;

-- Check calendar_events table
SELECT
    'CALENDAR_EVENTS TABLE COLUMNS' as info_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'calendar_events'
ORDER BY ordinal_position;

-- =====================================================
-- DISCOVERY 3: WHAT RLS POLICIES CURRENTLY EXIST?
-- =====================================================
-- Check existing RLS policies
SELECT
    'EXISTING RLS POLICIES' as info_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- DISCOVERY 4: WHICH TABLES HAVE RLS ENABLED?
-- =====================================================
SELECT
    'RLS STATUS' as info_type,
    t.table_name,
    CASE WHEN c.relrowsecurity THEN 'RLS_ENABLED' ELSE 'NO_RLS' END as rls_status
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name NOT LIKE 'pg_%'
ORDER BY rls_status DESC, t.table_name;

-- =====================================================
-- DISCOVERY 5: WHAT ROLES EXIST?
-- =====================================================
SELECT
    'DATABASE ROLES' as info_type,
    rolname,
    rolsuper,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin
FROM pg_roles
WHERE rolname IN ('authenticated', 'anon', 'admin', 'service_role', 'postgres')
ORDER BY rolname;

-- =====================================================
-- DISCOVERY 6: CURRENT TABLE PERMISSIONS
-- =====================================================
SELECT
    'TABLE PERMISSIONS' as info_type,
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee IN ('authenticated', 'anon', 'admin', 'service_role')
  AND table_name NOT LIKE 'pg_%'
ORDER BY table_name, grantee, privilege_type;

-- =====================================================
-- DISCOVERY 7: CHECK FOR ADMIN_USERS TABLE
-- =====================================================
SELECT
    'ADMIN_USERS TABLE' as info_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_users'
ORDER BY ordinal_position;

-- If no results from above, the admin_users table doesn't exist

-- =====================================================
-- DISCOVERY 8: SYSTEM CATALOG COLUMN NAMES
-- =====================================================
-- Check what columns pg_policies actually has
SELECT
    'PG_POLICIES COLUMNS' as info_type,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'pg_catalog'
  AND table_name = 'pg_policies'
ORDER BY ordinal_position;

-- Check what columns pg_tables actually has
SELECT
    'PG_TABLES COLUMNS' as info_type,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'pg_catalog'
  AND table_name = 'pg_tables'
ORDER BY ordinal_position;

-- =====================================================
-- SUMMARY MESSAGE
-- =====================================================
SELECT
    'NEXT STEPS' as info_type,
    'Review the results above to understand your database structure' as step_1,
    'Look for any missing tables that the fixes expect to exist' as step_2,
    'Check if column names match what the fixes expect' as step_3,
    'Run corrected fixes based on actual schema discovered' as step_4;