-- Fix calendar_events RLS - Final Solution
-- Problem: "admin" is not a PostgreSQL role, it's a JWT claim
-- Solution: Policies should be granted to authenticated role only (which handles all logged-in users)

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can create own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar events" ON calendar_events;

-- Step 2: Create policies for authenticated role ONLY
-- The "authenticated" role covers ALL logged-in users (including admins)
CREATE POLICY "Users can view own calendar events"
ON calendar_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calendar events"
ON calendar_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events"
ON calendar_events
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events"
ON calendar_events
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Step 3: Verify the fix
SELECT
    policyname,
    roles::text,
    cmd as command,
    qual as using_clause
FROM pg_policies
WHERE tablename = 'calendar_events'
ORDER BY policyname;
