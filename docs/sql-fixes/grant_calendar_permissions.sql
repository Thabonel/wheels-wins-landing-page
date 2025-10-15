-- Grant explicit permissions to calendar_events table
-- This fixes 403 errors even when RLS is disabled

-- First, ensure RLS is disabled
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;

-- Grant ALL permissions to anon role (used by Supabase client)
GRANT ALL ON calendar_events TO anon;

-- Grant ALL permissions to authenticated role
GRANT ALL ON calendar_events TO authenticated;

-- Grant ALL permissions to service_role
GRANT ALL ON calendar_events TO service_role;

-- Drop ALL existing policies (if any remain)
DROP POLICY IF EXISTS "Users can manage own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Admins can manage all calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users and admins can manage calendar events" ON calendar_events;

-- Verify the changes
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'calendar_events';

SELECT
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'calendar_events'
ORDER BY grantee, privilege_type;
