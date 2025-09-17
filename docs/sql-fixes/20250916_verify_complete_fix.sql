-- Verify Complete RLS and Security Fix
-- Run this AFTER 20250916_fix_rls_and_security.sql

-- 1. Confirm RLS is enabled
SELECT
    'RLS Status Check' as verification,
    CASE
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS STILL DISABLED'
    END as status,
    tablename
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_settings';

-- 2. Confirm policy exists and is active
SELECT
    'Policy Check' as verification,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ POLICY EXISTS'
        ELSE '❌ NO POLICIES'
    END as status,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_settings';

-- 3. Confirm vulnerable functions are removed
SELECT
    'Security Functions Check' as verification,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ VULNERABLE FUNCTIONS REMOVED'
        ELSE '❌ FUNCTIONS STILL EXIST'
    END as status,
    COUNT(*) as function_count,
    STRING_AGG(routine_name, ', ') as remaining_functions
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('check_auth_status', 'get_user_id_alternative');

-- 4. Confirm vulnerable view is removed
SELECT
    'Security View Check' as verification,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ VULNERABLE VIEW REMOVED'
        ELSE '❌ VIEW STILL EXISTS'
    END as status
FROM information_schema.views
WHERE table_schema = 'public' AND table_name = 'auth_diagnostics';

-- 5. Test table access (should work now)
SELECT
    'Access Test' as verification,
    '✅ TABLE ACCESSIBLE' as status,
    COUNT(*) as row_count
FROM public.user_settings;

-- 6. Final summary
SELECT
    'FINAL STATUS' as verification,
    'All checks should show ✅' as expected_result,
    'Run JWT Real Test in app to confirm' as next_step;