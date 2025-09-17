SELECT
    'Policy Status Check' as info,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as active_policies
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_settings';

SELECT
    'RLS Status' as info,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_settings';

SELECT
    'Access Test' as info,
    COUNT(*) as accessible_rows
FROM public.user_settings;

SELECT
    'Auth Status' as info,
    auth.uid() as current_user_id,
    CASE WHEN auth.uid() IS NULL THEN 'NULL' ELSE 'WORKING' END as status;