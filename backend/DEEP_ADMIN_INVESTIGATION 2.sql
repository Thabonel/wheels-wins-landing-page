-- DEEP INVESTIGATION: Find ALL sources of "SET ROLE admin" error
-- The is_admin_user function is gone but error persists - there's another source

-- ================================================================
-- STEP 1: CHECK FOR ANY REMAINING ADMIN FUNCTIONS
-- ================================================================
-- Look for ANY function that might trigger role switching
SELECT 
    routine_name,
    routine_type,
    security_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_definition ILIKE '%SET ROLE%'
    OR routine_definition ILIKE '%admin%'
    OR routine_definition ILIKE '%SECURITY DEFINER%'
    OR security_type = 'DEFINER'
  )
ORDER BY routine_name;

-- ================================================================
-- STEP 2: CHECK FOR DATABASE TRIGGERS
-- ================================================================
-- Triggers can also cause role switching
SELECT 
    trigger_name,
    trigger_schema,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    action_statement ILIKE '%admin%'
    OR action_statement ILIKE '%SET ROLE%'
    OR event_object_table IN ('calendar_events', 'profiles', 'expenses')
  )
ORDER BY event_object_table, trigger_name;

-- ================================================================
-- STEP 3: CHECK FOR ROW LEVEL SECURITY ENABLEMENT
-- ================================================================
-- See which tables have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    enablerls as rls_forced
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('calendar_events', 'profiles', 'expenses')
ORDER BY tablename;

-- ================================================================
-- STEP 4: CHECK CALENDAR_EVENTS TABLE FOR MISSING INSERT POLICY
-- ================================================================
-- Notice calendar_events has no INSERT policy - this could be the issue
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'calendar_events'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- ================================================================
-- STEP 5: CHECK FOR FOREIGN KEY CONSTRAINTS THAT MIGHT CAUSE ISSUES
-- ================================================================
-- Check if calendar_events has foreign keys to admin-related tables
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'calendar_events';

-- ================================================================
-- STEP 6: CHECK FOR SUPABASE AUTH HOOKS/TRIGGERS
-- ================================================================
-- Supabase might have auth hooks that check admin status
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments,
    p.prosrc as source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('auth', 'public')
  AND (
    p.prosrc ILIKE '%admin%'
    OR p.prosrc ILIKE '%SET ROLE%'
    OR p.proname ILIKE '%admin%'
  )
ORDER BY schema_name, function_name;

-- ================================================================
-- STEP 7: EMERGENCY NUCLEAR OPTION - DISABLE RLS COMPLETELY
-- ================================================================
-- If we still can't find the source, temporarily disable ALL RLS
-- This will tell us if RLS policies are the cause

-- TEMPORARILY DISABLE RLS (uncomment to test):
-- ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;

-- Test your app with RLS disabled
-- If it works, the issue is definitely in RLS policies

-- REMEMBER TO RE-ENABLE:
-- ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 8: CREATE MINIMAL INSERT POLICY FOR CALENDAR_EVENTS
-- ================================================================
-- I notice calendar_events is missing an INSERT policy
-- This might be causing the system to check admin permissions

DROP POLICY IF EXISTS "events_insert" ON calendar_events;
CREATE POLICY "calendar_events_insert_policy" 
ON calendar_events
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid()::text);

-- ================================================================
-- STEP 9: CHECK FOR ADMIN ROLES IN DATABASE
-- ================================================================
-- Check if there are actual PostgreSQL roles that might be causing issues
SELECT 
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolreplication,
    rolbypassrls
FROM pg_roles
WHERE rolname ILIKE '%admin%'
   OR rolsuper = true
ORDER BY rolname;

-- ================================================================
-- STEP 10: CHECK SUPABASE SPECIFIC ADMIN CHECKS
-- ================================================================
-- Look for Supabase's built-in admin checking mechanisms
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname IN ('auth', 'public')
  AND (
    viewname ILIKE '%admin%'
    OR definition ILIKE '%admin%'
  );

-- ================================================================
-- EMERGENCY DIAGNOSTIC QUERIES
-- ================================================================
-- Run these if the above doesn't find the issue:

-- Check for any remaining policies with complex logic
SELECT 
    tablename,
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND (
    length(qual) > 50 
    OR length(with_check) > 50
    OR qual ILIKE '%(%'
    OR with_check ILIKE '%(%'
  )
ORDER BY tablename;

-- Check for inherited policies from parent tables
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasrls,
    hasrlsforce
FROM pg_tables 
WHERE schemaname = 'public'
  AND hasrls = true
ORDER BY tablename;