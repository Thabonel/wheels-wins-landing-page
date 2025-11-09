-- Fix calendar_events RLS policy to support admin role
-- Problem: Admin users get "permission denied" error when querying calendar_events
-- Root cause: RLS policy only checks auth.uid() = user_id, doesn't account for admin role

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage own calendar events" ON calendar_events;

-- Create new policy that supports both authenticated and admin roles
CREATE POLICY "Users and admins can manage calendar events" ON calendar_events
  FOR ALL
  USING (
    auth.uid() = user_id
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Ensure RLS is enabled
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
