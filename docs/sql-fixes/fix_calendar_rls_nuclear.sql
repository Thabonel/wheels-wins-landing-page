-- NUCLEAR OPTION: Allow all authenticated users to access calendar_events
-- This is for debugging only - replace with proper RLS later

-- Disable RLS temporarily to test if that's the issue
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;

-- Check the results
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'calendar_events';

-- Also check if events exist
SELECT COUNT(*) as total_events, user_id
FROM calendar_events
GROUP BY user_id;
