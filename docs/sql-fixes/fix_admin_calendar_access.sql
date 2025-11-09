DROP POLICY IF EXISTS "Users can view own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can create own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar events" ON calendar_events;
CREATE POLICY "Users can view own calendar events"
ON calendar_events
FOR SELECT
USING (
  auth.uid() = user_id
  AND (
    auth.jwt()->>'role' = 'authenticated'
    OR auth.jwt()->>'role' = 'admin'
  )
);
CREATE POLICY "Users can create own calendar events"
ON calendar_events
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    auth.jwt()->>'role' = 'authenticated'
    OR auth.jwt()->>'role' = 'admin'
  )
);
CREATE POLICY "Users can update own calendar events"
ON calendar_events
FOR UPDATE
USING (
  auth.uid() = user_id
  AND (
    auth.jwt()->>'role' = 'authenticated'
    OR auth.jwt()->>'role' = 'admin'
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND (
    auth.jwt()->>'role' = 'authenticated'
    OR auth.jwt()->>'role' = 'admin'
  )
);
CREATE POLICY "Users can delete own calendar events"
ON calendar_events
FOR DELETE
USING (
  auth.uid() = user_id
  AND (
    auth.jwt()->>'role' = 'authenticated'
    OR auth.jwt()->>'role' = 'admin'
  )
);
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'calendar_events'
ORDER BY policyname;
