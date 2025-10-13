-- MINIMAL TEST - Run each query separately to find which one fails
-- Copy and run ONE AT A TIME in Supabase SQL Editor

-- ============================================================================
-- TEST 1: Simple signup count
-- ============================================================================
SELECT COUNT(*) as total_signups FROM auth.users;
-- If this fails: auth.users table issue (unlikely)

-- ============================================================================
-- TEST 2: Signup health view (simplified)
-- ============================================================================
DROP VIEW IF EXISTS signup_health_check CASCADE;

CREATE VIEW signup_health_check AS
SELECT
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as signups_last_24h,
    MAX(created_at) as last_signup_time
FROM auth.users;

SELECT * FROM signup_health_check;
-- If this fails: Issue with FILTER or date comparison

-- ============================================================================
-- TEST 3: Security function check (ultra simple)
-- ============================================================================
DROP FUNCTION IF EXISTS test_security_check();

CREATE FUNCTION test_security_check()
RETURNS TABLE(function_name text, is_secure text) AS $$
BEGIN
    RETURN QUERY
    SELECT
        proname::text,
        CASE WHEN prosecdef THEN 'YES' ELSE 'NO' END
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'update_updated_at_column';
END;
$$ LANGUAGE plpgsql;

SELECT * FROM test_security_check();
-- If this fails: Issue with pg_proc query

-- ============================================================================
-- TEST 4: RLS check (ultra simple)
-- ============================================================================
DROP FUNCTION IF EXISTS test_rls_check();

CREATE FUNCTION test_rls_check()
RETURNS TABLE(table_name text, has_rls text) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tablename::text,
        CASE WHEN rowsecurity THEN 'YES' ELSE 'NO' END
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'profiles';
END;
$$ LANGUAGE plpgsql;

SELECT * FROM test_rls_check();
-- If this fails: Issue with pg_tables query

-- ============================================================================
-- TEST 5: Simple aggregation with CTE
-- ============================================================================
DROP FUNCTION IF EXISTS test_aggregate();

CREATE FUNCTION test_aggregate()
RETURNS TABLE(total bigint, secure bigint) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT COUNT(*) as cnt FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    )
    SELECT cnt, cnt FROM stats;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM test_aggregate();
-- If this fails: Issue with CTE or COUNT

-- ============================================================================
-- DIAGNOSIS INSTRUCTIONS
-- ============================================================================
-- Run each test above IN ORDER
-- When you get an error, STOP and report:
-- 1. Which test number failed (1-5)
-- 2. The exact error message
-- 3. Any additional context

-- This will help identify the exact source of the bigint = uuid error
