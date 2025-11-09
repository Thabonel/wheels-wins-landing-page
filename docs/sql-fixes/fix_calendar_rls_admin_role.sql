-- Fix calendar_events RLS to support admin role
-- Problem: User has "admin" role but policies only allow "authenticated"
-- Error: permission denied for table calendar_events (code: 42501)

-- Drop existing policies that only support "authenticated"
DROP POLICY IF EXISTS "Users can view own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can create own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar events" ON calendar_events;

-- Create new policies supporting BOTH authenticated AND admin roles
CREATE POLICY "Users can view own calendar events"
ON calendar_events
FOR SELECT
TO authenticated, admin
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calendar events"
ON calendar_events
FOR INSERT
TO authenticated, admin
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events"
ON calendar_events
FOR UPDATE
TO authenticated, admin
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events"
ON calendar_events
FOR DELETE
TO authenticated, admin
USING (auth.uid() = user_id);

-- Verify policies were created correctly
SELECT
    policyname,
    permissive,
    roles,
    cmd as command
FROM pg_policies
WHERE tablename = 'calendar_events'
ORDER BY policyname;
