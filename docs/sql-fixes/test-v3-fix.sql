-- Quick Test: Verify V3 Fix Works
-- Run this AFTER installing security-monitoring-setup-v3.sql

-- Test 1: Check functions exist
SELECT
    'verify_rls_policies' as function_name,
    COUNT(*) as exists
FROM pg_proc
WHERE proname = 'verify_rls_policies'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Test 2: Call verify_rls_policies() - This previously caused the error
SELECT * FROM verify_rls_policies();

-- Test 3: Call verify_security_definer_functions()
SELECT * FROM verify_security_definer_functions();

-- Test 4: Call basic_health_check()
SELECT * FROM basic_health_check();

-- Test 5: Check signup health view
SELECT * FROM signup_health_check;

-- If all 5 tests pass without "bigint = uuid" error, the fix works! ✅
