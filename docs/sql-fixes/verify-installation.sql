-- ============================================================================
-- VERIFICATION SCRIPT: Security Monitoring Installation
-- Run this in Supabase SQL Editor to verify everything is working
-- ============================================================================

-- Test 1: Check if view exists
SELECT 'TEST 1: signup_health_check view' as test_name,
       CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END as result
FROM pg_views
WHERE schemaname = 'public' AND viewname = 'signup_health_check';

-- Test 2: Check if functions exist
SELECT 'TEST 2: verify_rls_policies function' as test_name,
       CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END as result
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname = 'verify_rls_policies';

SELECT 'TEST 3: verify_security_definer_functions function' as test_name,
       CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END as result
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname = 'verify_security_definer_functions';

-- Test 4: Run signup_health_check view
SELECT 'TEST 4: signup_health_check view execution' as test_name;
SELECT * FROM signup_health_check;

-- Test 5: Run verify_rls_policies function
SELECT 'TEST 5: verify_rls_policies function execution' as test_name;
SELECT * FROM verify_rls_policies();

-- Test 6: Run verify_security_definer_functions
SELECT 'TEST 6: verify_security_definer_functions execution' as test_name;
SELECT * FROM verify_security_definer_functions();

-- Test 7: Check grants
SELECT 'TEST 7: Permissions granted' as test_name,
       grantee,
       privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('verify_rls_policies', 'verify_security_definer_functions')
ORDER BY routine_name, grantee;

-- ============================================================================
-- SUMMARY: If all tests show ✅ and return data, installation is complete!
-- ============================================================================
