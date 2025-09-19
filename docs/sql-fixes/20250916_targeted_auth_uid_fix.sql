-- Targeted auth.uid() Fix
-- Addresses specific common causes of auth.uid() returning NULL
-- Date: 2025-09-16

-- 1. Check if auth schema functions exist and are properly defined
SELECT
    proname as function_name,
    prosrc as function_body,
    provolatile as volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'auth'
AND proname IN ('uid', 'jwt', 'role');

-- 2. Check current JWT settings that might affect auth.uid()
SELECT
    name,
    setting,
    source,
    sourcefile
FROM pg_settings
WHERE name LIKE '%jwt%' OR name LIKE '%auth%'
ORDER BY name;

-- 3. Test if we can manually extract user ID from JWT
CREATE OR REPLACE FUNCTION test_manual_jwt_extraction()
RETURNS TABLE (
    method text,
    result text,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Method 1: Standard auth.uid()
    BEGIN
        RETURN QUERY SELECT
            'auth.uid()' as method,
            COALESCE(auth.uid()::text, 'NULL') as result,
            CASE WHEN auth.uid() IS NULL THEN 'FAILED' ELSE 'SUCCESS' END as status;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'auth.uid()' as method,
            'ERROR: ' || SQLERRM as result,
            'ERROR' as status;
    END;

    -- Method 2: Direct JWT claim extraction
    BEGIN
        RETURN QUERY SELECT
            'jwt.claim.sub' as method,
            current_setting('request.jwt.claim.sub', true) as result,
            CASE
                WHEN current_setting('request.jwt.claim.sub', true) IS NULL OR
                     current_setting('request.jwt.claim.sub', true) = ''
                THEN 'FAILED'
                ELSE 'SUCCESS'
            END as status;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'jwt.claim.sub' as method,
            'ERROR: ' || SQLERRM as result,
            'ERROR' as status;
    END;

    -- Method 3: Full JWT claims inspection
    BEGIN
        RETURN QUERY SELECT
            'jwt.claims.raw' as method,
            current_setting('request.jwt.claims', true) as result,
            CASE
                WHEN current_setting('request.jwt.claims', true) IS NULL OR
                     current_setting('request.jwt.claims', true) = ''
                THEN 'FAILED'
                ELSE 'SUCCESS'
            END as status;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'jwt.claims.raw' as method,
            'ERROR: ' || SQLERRM as result,
            'ERROR' as status;
    END;

    -- Method 4: Check if we have any request context at all
    BEGIN
        RETURN QUERY SELECT
            'request.headers' as method,
            current_setting('request.headers', true) as result,
            CASE
                WHEN current_setting('request.headers', true) IS NULL OR
                     current_setting('request.headers', true) = ''
                THEN 'NO_HEADERS'
                ELSE 'HAS_HEADERS'
            END as status;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'request.headers' as method,
            'ERROR: ' || SQLERRM as result,
            'ERROR' as status;
    END;
END;
$$;

-- Run the JWT extraction test
SELECT * FROM test_manual_jwt_extraction();

-- 4. Create an alternative auth function that might work
CREATE OR REPLACE FUNCTION get_user_id_alternative()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id uuid;
    jwt_sub text;
    jwt_claims jsonb;
BEGIN
    -- Try method 1: Standard auth.uid()
    BEGIN
        SELECT auth.uid() INTO user_id;
        IF user_id IS NOT NULL THEN
            RETURN user_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Continue to next method
    END;

    -- Try method 2: Extract from jwt.claim.sub
    BEGIN
        SELECT current_setting('request.jwt.claim.sub', true) INTO jwt_sub;
        IF jwt_sub IS NOT NULL AND jwt_sub != '' THEN
            RETURN jwt_sub::uuid;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Continue to next method
    END;

    -- Try method 3: Parse full JWT claims
    BEGIN
        SELECT current_setting('request.jwt.claims', true)::jsonb INTO jwt_claims;
        IF jwt_claims IS NOT NULL AND jwt_claims ? 'sub' THEN
            RETURN (jwt_claims->>'sub')::uuid;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Continue to next method
    END;

    -- All methods failed
    RETURN NULL;
END;
$$;

-- Test the alternative function
SELECT
    get_user_id_alternative() as alt_user_id,
    auth.uid() as standard_auth_uid,
    CASE
        WHEN get_user_id_alternative() IS NOT NULL THEN 'ALTERNATIVE_WORKS'
        WHEN auth.uid() IS NOT NULL THEN 'STANDARD_WORKS'
        ELSE 'BOTH_FAILED'
    END as status;

-- 5. Check if there are any auth-related extensions that need to be enabled
SELECT
    extname,
    extversion,
    extrelocatable
FROM pg_extension
WHERE extname ILIKE '%auth%' OR extname ILIKE '%jwt%' OR extname ILIKE '%supabase%';

-- 6. Verify RLS is not blocking the auth functions themselves
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'auth';

-- 7. Create a comprehensive auth diagnostics view
CREATE OR REPLACE VIEW auth_diagnostics AS
SELECT
    'Current Session Info' as category,
    'current_user' as item,
    current_user as value
UNION ALL
SELECT
    'Current Session Info' as category,
    'session_user' as item,
    session_user as value
UNION ALL
SELECT
    'JWT Claims' as category,
    'jwt.claims' as item,
    current_setting('request.jwt.claims', true) as value
UNION ALL
SELECT
    'JWT Claims' as category,
    'jwt.claim.sub' as item,
    current_setting('request.jwt.claim.sub', true) as value
UNION ALL
SELECT
    'JWT Claims' as category,
    'jwt.claim.role' as item,
    current_setting('request.jwt.claim.role', true) as value
UNION ALL
SELECT
    'Auth Functions' as category,
    'auth.uid()' as item,
    COALESCE(auth.uid()::text, 'NULL') as value
UNION ALL
SELECT
    'Auth Functions' as category,
    'auth.role()' as item,
    COALESCE(auth.role()::text, 'NULL') as value
UNION ALL
SELECT
    'Alternative' as category,
    'get_user_id_alternative()' as item,
    COALESCE(get_user_id_alternative()::text, 'NULL') as value;

-- Show the diagnostics
SELECT * FROM auth_diagnostics ORDER BY category, item;

-- Clean up test function
DROP FUNCTION IF EXISTS test_manual_jwt_extraction();

-- Final status message
DO $$
DECLARE
    auth_uid_result uuid;
    alt_result uuid;
BEGIN
    SELECT auth.uid() INTO auth_uid_result;
    SELECT get_user_id_alternative() INTO alt_result;

    RAISE NOTICE '=== AUTH.UID() DIAGNOSIS COMPLETE ===';

    IF auth_uid_result IS NOT NULL THEN
        RAISE NOTICE '✅ auth.uid() is now working: %', auth_uid_result;
        RAISE NOTICE '🎯 You can now run the restore_proper_rls_policies.sql script';
    ELSIF alt_result IS NOT NULL THEN
        RAISE NOTICE '⚠️  auth.uid() still broken but alternative method works: %', alt_result;
        RAISE NOTICE '🔧 Consider using get_user_id_alternative() in RLS policies temporarily';
    ELSE
        RAISE NOTICE '❌ Both auth.uid() and alternative method failed';
        RAISE NOTICE '📋 Check the diagnostics output above for clues';
        RAISE NOTICE '💡 Likely issues:';
        RAISE NOTICE '   1. JWT secret mismatch between frontend and database';
        RAISE NOTICE '   2. Missing Authorization header in requests';
        RAISE NOTICE '   3. Corrupted auth schema or functions';
        RAISE NOTICE '   4. Wrong Supabase project configuration';
    END IF;
END $$;