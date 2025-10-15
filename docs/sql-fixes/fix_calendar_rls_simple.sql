-- Simpler fix: Allow admin users to access ALL calendar events
-- This avoids the subquery performance issue

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users and admins can manage calendar events" ON calendar_events;

-- Create two separate policies: one for regular users, one for admins
CREATE POLICY "Users can manage their own calendar events"
ON calendar_events
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all calendar events"
ON calendar_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Make sure RLS is enabled
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Verify policies were created
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'calendar_events';
