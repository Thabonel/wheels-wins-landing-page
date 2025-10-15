-- Fix calendar_events RLS properly
-- This enables RLS and creates proper policies instead of disabling security

-- Step 1: Enable RLS (fixing the security error)
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop old broken policies
DROP POLICY IF EXISTS "calendar_events_select_own" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert_own" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_update_own" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete_own" ON calendar_events;
DROP POLICY IF EXISTS "Users can manage own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Admins can manage all calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users and admins can manage calendar events" ON calendar_events;

-- Step 3: Create new working policies
-- Allow users to SELECT their own calendar events
CREATE POLICY "Users can view own calendar events"
ON calendar_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to INSERT their own calendar events
CREATE POLICY "Users can create own calendar events"
ON calendar_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own calendar events
CREATE POLICY "Users can update own calendar events"
ON calendar_events
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE their own calendar events
CREATE POLICY "Users can delete own calendar events"
ON calendar_events
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Step 4: Allow service_role to bypass RLS (for admin operations)
-- Note: service_role already bypasses RLS by default, but we'll be explicit
GRANT ALL ON calendar_events TO service_role;

-- Step 5: Verify the setup
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'calendar_events';

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'calendar_events'
ORDER BY policyname;
