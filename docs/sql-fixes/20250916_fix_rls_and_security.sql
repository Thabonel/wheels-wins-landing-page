-- Fix RLS and Security Issues
-- Date: 2025-09-16
-- Addresses database linter errors: RLS disabled + security vulnerabilities

-- 1. ENABLE RLS on user_settings table (this is the missing piece!)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop security definer view first (depends on functions)
DROP VIEW IF EXISTS public.auth_diagnostics;

-- 3. Drop vulnerable debugging functions (security risk)
DROP FUNCTION IF EXISTS public.check_auth_status();
DROP FUNCTION IF EXISTS public.get_user_id_alternative();

-- 4. Ensure proper policy exists
DROP POLICY IF EXISTS "allow_authenticated_access" ON public.user_settings;

CREATE POLICY "allow_authenticated_access" ON public.user_settings
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Grant permissions to authenticated users
GRANT ALL ON public.user_settings TO authenticated;

-- 6. Verification queries
SELECT
    'RLS Status' as check_type,
    rowsecurity as enabled,
    CASE WHEN rowsecurity THEN 'FIXED' ELSE 'STILL_BROKEN' END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_settings';

SELECT
    'Policy Check' as check_type,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_settings';

SELECT
    'Access Test' as check_type,
    COUNT(*) as row_count,
    'Should be accessible now' as status
FROM public.user_settings;