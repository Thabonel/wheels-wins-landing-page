-- Fix RLS Policy for user_trips table
-- Issue: PAM tool failing with "new row violates row-level security policy for table user_trips"

-- Step 1: Check current policies
SELECT schemaname, tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_trips';

-- Step 2: Drop existing restrictive policies (if any)
DROP POLICY IF EXISTS "Users can only access their own trips" ON public.user_trips;
DROP POLICY IF EXISTS "user_trips_select_policy" ON public.user_trips;
DROP POLICY IF EXISTS "user_trips_insert_policy" ON public.user_trips;
DROP POLICY IF EXISTS "user_trips_update_policy" ON public.user_trips;
DROP POLICY IF EXISTS "user_trips_delete_policy" ON public.user_trips;

-- Step 3: Create permissive RLS policies for authenticated users
-- Allow users to select their own trips
CREATE POLICY "user_trips_select" ON public.user_trips
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to insert their own trips
CREATE POLICY "user_trips_insert" ON public.user_trips
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own trips
CREATE POLICY "user_trips_update" ON public.user_trips
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own trips
CREATE POLICY "user_trips_delete" ON public.user_trips
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.user_trips ENABLE ROW LEVEL SECURITY;

-- Step 5: Grant necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_trips TO authenticated;

-- Step 6: Verify the new policies
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_trips';