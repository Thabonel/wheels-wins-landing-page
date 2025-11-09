-- Verify calendar_events table permissions and RLS status
-- Run these queries in Supabase SQL Editor to diagnose the 403 error

-- 1. Check if RLS is actually disabled
SELECT
    tablename,
    rowsecurity as rls_enabled,
    CASE
        WHEN rowsecurity THEN 'RLS is ENABLED (this is the problem!)'
        ELSE 'RLS is DISABLED (should work)'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'calendar_events';

-- 2. Check table-level GRANT permissions
SELECT
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'calendar_events';

-- 3. Check if any policies still exist (should be none if RLS disabled)
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'calendar_events';

-- 4. Count total events in database (bypass RLS check)
SELECT COUNT(*) as total_events
FROM calendar_events;

-- 5. Check events for specific user
SELECT
    id,
    user_id,
    title,
    start_date,
    event_type,
    created_at
FROM calendar_events
WHERE user_id = '21a2151a-cd37-41d5-a1c7-124bb05e7a6a'
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check current authentication context
SELECT
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- 7. Check if anon role has SELECT permission
SELECT
    has_table_privilege('anon', 'calendar_events', 'SELECT') as anon_can_select,
    has_table_privilege('authenticated', 'calendar_events', 'SELECT') as authenticated_can_select,
    has_table_privilege('service_role', 'calendar_events', 'SELECT') as service_role_can_select;
