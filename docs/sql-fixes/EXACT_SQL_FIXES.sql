-- EXACT SQL FIXES FOR WHEELS AND WINS DATABASE PERMISSIONS
-- Run these commands in Supabase Dashboard → SQL Editor
-- Execute them one by one in the order shown

-- ================================================================
-- FIX #1: CHECK CURRENT RLS POLICIES
-- ================================================================
-- First, let's see what policies currently exist
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('calendar_events', 'profiles', 'expenses')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================================
-- FIX #2: COMPLETELY RESET CALENDAR_EVENTS RLS POLICIES
-- ================================================================
-- Drop ALL existing policies for calendar_events
DROP POLICY IF EXISTS "Users can manage own events" ON calendar_events;
DROP POLICY IF EXISTS "Admins can read all events" ON calendar_events;
DROP POLICY IF EXISTS "Admins can manage all events" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_user_policy" ON calendar_events;
DROP POLICY IF EXISTS "calendar_user_access" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_simple_access" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_anon_access" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_user_access" ON calendar_events;

-- Create ONE simple policy that works
CREATE POLICY "calendar_simple_user_policy" 
ON calendar_events
FOR ALL 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ================================================================
-- FIX #3: COMPLETELY RESET PROFILES RLS POLICIES  
-- ================================================================
-- Drop ALL existing policies for profiles
DROP POLICY IF EXISTS "Users can manage own profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_user_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_safe_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_simple_access" ON profiles;
DROP POLICY IF EXISTS "profiles_anon_access" ON profiles;
DROP POLICY IF EXISTS "profiles_user_access" ON profiles;

-- Create ONE simple policy that works
CREATE POLICY "profiles_simple_user_policy" 
ON profiles
FOR ALL 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ================================================================
-- FIX #4: RESET EXPENSES RLS POLICIES
-- ================================================================
-- Drop ALL existing policies for expenses
DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can manage all expenses" ON expenses;
DROP POLICY IF EXISTS "expenses_simple_access" ON expenses;
DROP POLICY IF EXISTS "expenses_user_access" ON expenses;

-- Create ONE simple policy that works
CREATE POLICY "expenses_simple_user_policy" 
ON expenses
FOR ALL 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ================================================================
-- FIX #5: CHECK FOR ADMIN-RELATED FUNCTIONS THAT CAUSE ROLE SWITCHING
-- ================================================================
-- Look for functions that might trigger "SET ROLE admin" errors
SELECT 
    routine_name,
    routine_type,
    security_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_definition ILIKE '%SET ROLE%'
    OR routine_definition ILIKE '%admin%'
    OR security_type = 'DEFINER'
  )
LIMIT 20;

-- ================================================================
-- FIX #6: CHECK FOREIGN KEY CONSTRAINTS ON PROFILES
-- ================================================================
-- The test showed profiles table has foreign key to users table
-- Let's check this constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'profiles';

-- ================================================================
-- FIX #7: TEMPORARILY DISABLE RLS FOR TESTING (OPTIONAL)
-- ================================================================
-- If the above fixes don't work, temporarily disable RLS for testing
-- WARNING: Only use this for testing, re-enable for production

-- To disable RLS (for testing only):
-- ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS (after testing):
-- ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- FIX #8: TEST THE FIXES
-- ================================================================
-- Test inserting data after applying the fixes above
-- This should work without "permission denied to set role admin" errors

-- Test calendar event (will fail if user doesn't exist in auth.users)
INSERT INTO calendar_events (
    user_id, 
    title, 
    description, 
    date, 
    start_time, 
    end_time,
    timezone,
    type
) VALUES (
    auth.uid(),  -- This will be the current authenticated user
    'Policy Test Event',
    'Testing new RLS policies',
    CURRENT_DATE,
    '10:00:00',
    '11:00:00',
    'UTC',
    'test'
);

-- Clean up test data
DELETE FROM calendar_events WHERE title = 'Policy Test Event';

-- ================================================================
-- FIX #9: VERIFY FINAL POLICIES
-- ================================================================
-- Check that only our new simple policies exist
SELECT 
    tablename, 
    policyname, 
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('calendar_events', 'profiles', 'expenses')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================================
-- SUMMARY OF WHAT THESE FIXES DO:
-- ================================================================
-- 1. Remove ALL existing RLS policies that might reference admin roles
-- 2. Create simple policies that only check user_id = auth.uid()
-- 3. Eliminate any complex logic that could trigger "SET ROLE admin"
-- 4. Provide diagnostic queries to identify remaining issues
-- 5. Include test queries to verify the fixes work
--
-- AFTER RUNNING THESE:
-- - Calendar events should save properly
-- - Profile updates should work
-- - No more "permission denied to set role admin" errors
-- - All user data creation should succeed
-- ================================================================