-- Fix JWT Authentication Context Issue
-- Addresses: auth.uid() returning null despite valid JWT tokens
-- Date: 2025-09-16

-- Check current auth configuration
SELECT current_setting('app.settings.jwt_secret', true) as jwt_secret_set;
SELECT current_setting('app.settings.jwt_exp', true) as jwt_exp_set;

-- Check if auth schema and functions exist
SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata
    WHERE schema_name = 'auth'
) as auth_schema_exists;

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'auth'
AND routine_name IN ('uid', 'jwt', 'role')
ORDER BY routine_name;

-- Test JWT parsing function
CREATE OR REPLACE FUNCTION test_jwt_context()
RETURNS TABLE (
    current_user_id uuid,
    auth_role text,
    jwt_claims json,
    jwt_sub text,
    raw_jwt text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY SELECT
        auth.uid() as current_user_id,
        auth.role() as auth_role,
        auth.jwt() as jwt_claims,
        current_setting('request.jwt.claim.sub', true) as jwt_sub,
        current_setting('request.jwt.claims', true) as raw_jwt;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in JWT context test: %', SQLERRM;
    RETURN;
END;
$$;

-- Test the JWT context
SELECT * FROM test_jwt_context();

-- Check if RLS is properly configured for auth functions
SELECT
    schemaname,
    tablename,
    rowsecurity,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_settings', 'profiles', 'user_subscriptions', 'user_trips')
ORDER BY tablename, policyname;

-- Create a comprehensive auth diagnostics function
CREATE OR REPLACE FUNCTION diagnose_auth_issue()
RETURNS TABLE (
    check_name text,
    status text,
    details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_uid_result uuid;
    auth_role_result text;
    jwt_claims_result json;
BEGIN
    -- Test 1: Check auth.uid()
    BEGIN
        SELECT auth.uid() INTO auth_uid_result;
        IF auth_uid_result IS NULL THEN
            RETURN QUERY SELECT 'auth.uid()', 'FAIL', 'Returns NULL - JWT context not set';
        ELSE
            RETURN QUERY SELECT 'auth.uid()', 'PASS', 'Returns: ' || auth_uid_result::text;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'auth.uid()', 'ERROR', 'Function failed: ' || SQLERRM;
    END;

    -- Test 2: Check auth.role()
    BEGIN
        SELECT auth.role() INTO auth_role_result;
        IF auth_role_result IS NULL THEN
            RETURN QUERY SELECT 'auth.role()', 'FAIL', 'Returns NULL - no role in JWT';
        ELSE
            RETURN QUERY SELECT 'auth.role()', 'PASS', 'Returns: ' || auth_role_result;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'auth.role()', 'ERROR', 'Function failed: ' || SQLERRM;
    END;

    -- Test 3: Check auth.jwt()
    BEGIN
        SELECT auth.jwt() INTO jwt_claims_result;
        IF jwt_claims_result IS NULL THEN
            RETURN QUERY SELECT 'auth.jwt()', 'FAIL', 'Returns NULL - no JWT claims';
        ELSE
            RETURN QUERY SELECT 'auth.jwt()', 'PASS', 'Claims present with ' || json_object_keys(jwt_claims_result)::text || ' keys';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'auth.jwt()', 'ERROR', 'Function failed: ' || SQLERRM;
    END;

    -- Test 4: Check JWT settings
    BEGIN
        RETURN QUERY SELECT 'jwt.claim.sub', 'INFO', current_setting('request.jwt.claim.sub', true);
        RETURN QUERY SELECT 'jwt.claim.role', 'INFO', current_setting('request.jwt.claim.role', true);
        RETURN QUERY SELECT 'jwt.claims', 'INFO', current_setting('request.jwt.claims', true);
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'jwt.settings', 'ERROR', 'Failed to read JWT settings: ' || SQLERRM;
    END;

    -- Test 5: Check if auth schema is accessible
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
            RETURN QUERY SELECT 'auth.schema', 'PASS', 'Auth schema exists and is accessible';
        ELSE
            RETURN QUERY SELECT 'auth.schema', 'FAIL', 'Auth schema not found or not accessible';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'auth.schema', 'ERROR', 'Failed to check auth schema: ' || SQLERRM;
    END;

    RETURN;
END;
$$;

-- Run the comprehensive diagnosis
SELECT * FROM diagnose_auth_issue();

-- If auth.uid() is working, update policies to use it properly
-- If not, we'll need to use the temporary permissive policies
DO $$
DECLARE
    test_auth_uid uuid;
BEGIN
    -- Test if auth.uid() works
    SELECT auth.uid() INTO test_auth_uid;

    IF test_auth_uid IS NOT NULL THEN
        RAISE NOTICE 'auth.uid() is working, updating policies to use proper authentication';

        -- Update user_settings policies
        DROP POLICY IF EXISTS "Temp: Allow authenticated access to settings" ON public.user_settings;
        CREATE POLICY "Users can manage their own settings" ON public.user_settings
            FOR ALL TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        -- Update user_subscriptions policies
        DROP POLICY IF EXISTS "Temp: Allow authenticated access to subscriptions" ON public.user_subscriptions;
        CREATE POLICY "Users can manage their own subscriptions" ON public.user_subscriptions
            FOR ALL TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        -- Update user_trips policies
        DROP POLICY IF EXISTS "Temp: Allow authenticated access to trips" ON public.user_trips;
        CREATE POLICY "Users can manage their own trips" ON public.user_trips
            FOR ALL TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        -- Update trip_template_ratings policies
        DROP POLICY IF EXISTS "Temp: Allow authenticated access to ratings" ON public.trip_template_ratings;
        CREATE POLICY "Users can view all ratings and manage their own" ON public.trip_template_ratings
            FOR ALL TO authenticated
            USING (true)
            WITH CHECK (auth.uid() = user_id);

        RAISE NOTICE '✅ Proper authentication-based policies have been created';
    ELSE
        RAISE NOTICE '⚠️ auth.uid() is still returning NULL - keeping temporary permissive policies';
        RAISE NOTICE '💡 Check your Supabase project configuration and JWT settings';
    END IF;
END;
$$;

-- Clean up test functions
DROP FUNCTION IF EXISTS test_jwt_context();

-- Final status message
DO $$
BEGIN
    RAISE NOTICE 'Authentication context diagnosis complete. Review the output above.';
END $$;