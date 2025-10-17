DROP POLICY IF EXISTS "Users can view own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can create own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar events" ON calendar_events;

CREATE POLICY "Users can view own calendar events"
ON calendar_events
FOR SELECT
TO authenticated, anon
USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can create own calendar events"
ON calendar_events
FOR INSERT
TO authenticated, anon
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can update own calendar events"
ON calendar_events
FOR UPDATE
TO authenticated, anon
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events"
ON calendar_events
FOR DELETE
TO authenticated, anon
USING (auth.uid() = user_id);

SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'calendar_events'
ORDER BY policyname;
