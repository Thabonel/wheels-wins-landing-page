-- Fix Calendar Events RLS Policies
-- Date: January 2025
-- Issue: Calendar tools failing with 403 Forbidden errors
-- Root Cause: RLS policies blocking authenticated users

-- Step 1: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can insert their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete their own calendar events" ON calendar_events;

-- Step 2: Ensure RLS is enabled on the table
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Step 3: Create proper RLS policies for authenticated users

-- Policy 1: SELECT - Users can view their own calendar events
CREATE POLICY "Users can view their own calendar events"
  ON calendar_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: INSERT - Users can create their own calendar events
CREATE POLICY "Users can insert their own calendar events"
  ON calendar_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: UPDATE - Users can update their own calendar events
CREATE POLICY "Users can update their own calendar events"
  ON calendar_events
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy 4: DELETE - Users can delete their own calendar events
CREATE POLICY "Users can delete their own calendar events"
  ON calendar_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verification Query (run after applying policies):
-- This should return the policies you just created:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'calendar_events';
