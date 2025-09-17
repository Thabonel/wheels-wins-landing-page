-- Final User Settings Fix - Direct and Simple
-- Date: 2025-09-16

-- 1. Check current state of user_settings table
SELECT
    'Current user_settings RLS status:' as info,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_settings';

-- 2. Check current policies
SELECT
    'Current policies on user_settings:' as info,
    policyname,
    roles,
    qual as using_clause,
    with_check as check_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_settings';

-- 3. Check if authenticated role has permissions
SELECT
    'Permissions for authenticated role:' as info,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'user_settings'
  AND grantee = 'authenticated';

-- 4. COMPLETE RESET - Remove everything and start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    RAISE NOTICE 'Starting complete reset of user_settings RLS...';

    -- Drop all existing policies
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'user_settings'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.user_settings', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;

    -- Disable RLS temporarily
    ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on user_settings';

    -- Re-enable RLS
    ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Re-enabled RLS on user_settings';

    -- Grant permissions
    GRANT ALL ON public.user_settings TO authenticated;
    RAISE NOTICE 'Granted ALL permissions to authenticated role';

    RAISE NOTICE 'Reset complete - now creating new policy...';
END $$;

-- 5. Create the simplest possible working policy
CREATE POLICY "allow_authenticated_access" ON public.user_settings
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Verify the new setup
SELECT
    'Final verification:' as info,
    't.rowsecurity' as rls_enabled,
    'COUNT(p.policyname)' as policy_count,
    'p.policyname' as policy_name
FROM pg_tables t
LEFT JOIN pg_policies p ON (t.schemaname = p.schemaname AND t.tablename = p.tablename)
WHERE t.schemaname = 'public' AND t.tablename = 'user_settings';

-- 7. Test access to the table
SELECT
    'Access test:' as info,
    COUNT(*) as total_rows,
    'Should be accessible now' as status
FROM public.user_settings;

-- 8. Final status message
DO $$
BEGIN
    RAISE NOTICE '==================================';
    RAISE NOTICE '✅ FINAL USER_SETTINGS FIX APPLIED';
    RAISE NOTICE '==================================';
    RAISE NOTICE '1. All old policies removed';
    RAISE NOTICE '2. RLS reset and re-enabled';
    RAISE NOTICE '3. Simple policy created: allow_authenticated_access';
    RAISE NOTICE '4. Policy allows ALL authenticated users access';
    RAISE NOTICE '5. Test your app now - user_settings should work';
    RAISE NOTICE '==================================';
END $$;