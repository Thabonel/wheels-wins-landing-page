-- FIXED SQL WITH CORRECT DATA TYPES
-- This fixes the "operator does not exist: text = uuid" error

-- ================================================================
-- STEP 1: CHECK DATA TYPES FIRST
-- ================================================================
-- Let's see what data types we're working with
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('calendar_events', 'profiles', 'expenses')
  AND column_name = 'user_id'
  AND table_schema = 'public';

-- Also check auth.uid() type
SELECT pg_typeof(auth.uid());

-- ================================================================
-- STEP 2: FIX CALENDAR_EVENTS WITH PROPER TYPE CASTING
-- ================================================================
-- Drop ALL existing policies for calendar_events
DROP POLICY IF EXISTS "Users can manage own events" ON calendar_events;
DROP POLICY IF EXISTS "Admins can read all events" ON calendar_events;
DROP POLICY IF EXISTS "Admins can manage all events" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_user_policy" ON calendar_events;
DROP POLICY IF EXISTS "calendar_user_access" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_simple_access" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_anon_access" ON calendar_events;
DROP POLICY IF EXISTS "calendar_simple_user_policy" ON calendar_events;

-- Create policy with proper type casting
-- If user_id is TEXT and auth.uid() is UUID:
CREATE POLICY "calendar_events_fixed_policy" 
ON calendar_events
FOR ALL 
TO authenticated 
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Alternative: If user_id is UUID and auth.uid() is TEXT:
-- CREATE POLICY "calendar_events_fixed_policy" 
-- ON calendar_events
-- FOR ALL 
-- TO authenticated 
-- USING (user_id::text = auth.uid())
-- WITH CHECK (user_id::text = auth.uid());

-- ================================================================
-- STEP 3: FIX PROFILES WITH PROPER TYPE CASTING
-- ================================================================
-- Drop ALL existing policies for profiles
DROP POLICY IF EXISTS "Users can manage own profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_user_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_safe_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_simple_access" ON profiles;
DROP POLICY IF EXISTS "profiles_anon_access" ON profiles;
DROP POLICY IF EXISTS "profiles_simple_user_policy" ON profiles;

-- Create policy with proper type casting
CREATE POLICY "profiles_fixed_policy" 
ON profiles
FOR ALL 
TO authenticated 
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- ================================================================
-- STEP 4: FIX EXPENSES WITH PROPER TYPE CASTING
-- ================================================================
-- Drop ALL existing policies for expenses
DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can manage all expenses" ON expenses;
DROP POLICY IF EXISTS "expenses_simple_access" ON expenses;
DROP POLICY IF EXISTS "expenses_simple_user_policy" ON expenses;

-- Create policy with proper type casting
CREATE POLICY "expenses_fixed_policy" 
ON expenses
FOR ALL 
TO authenticated 
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- ================================================================
-- STEP 5: ALTERNATIVE - IF CASTING auth.uid() TO TEXT DOESN'T WORK
-- ================================================================
-- Sometimes you need to cast the other way. Try these if above fails:

-- For calendar_events (cast user_id to match auth.uid() type):
-- DROP POLICY IF EXISTS "calendar_events_fixed_policy" ON calendar_events;
-- CREATE POLICY "calendar_events_alt_policy" 
-- ON calendar_events
-- FOR ALL 
-- TO authenticated 
-- USING (user_id::uuid = auth.uid())
-- WITH CHECK (user_id::uuid = auth.uid());

-- For profiles:
-- DROP POLICY IF EXISTS "profiles_fixed_policy" ON profiles;
-- CREATE POLICY "profiles_alt_policy" 
-- ON profiles
-- FOR ALL 
-- TO authenticated 
-- USING (user_id::uuid = auth.uid())
-- WITH CHECK (user_id::uuid = auth.uid());

-- For expenses:
-- DROP POLICY IF EXISTS "expenses_fixed_policy" ON expenses;
-- CREATE POLICY "expenses_alt_policy" 
-- ON expenses
-- FOR ALL 
-- TO authenticated 
-- USING (user_id::uuid = auth.uid())
-- WITH CHECK (user_id::uuid = auth.uid());

-- ================================================================
-- STEP 6: TEST THE FIXED POLICIES
-- ================================================================
-- Test with a real authenticated user (you need to be logged in)
-- This should work without type errors:

SELECT 
    'Testing auth.uid() value and type:' as test,
    auth.uid() as uid_value,
    pg_typeof(auth.uid()) as uid_type;

-- ================================================================
-- STEP 7: VERIFY FINAL POLICIES
-- ================================================================
-- Check that our new policies are in place
SELECT 
    tablename, 
    policyname, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('calendar_events', 'profiles', 'expenses')
  AND schemaname = 'public'
  AND policyname LIKE '%fixed%'
ORDER BY tablename, policyname;

-- ================================================================
-- EMERGENCY OPTION: TEMPORARILY DISABLE RLS FOR TESTING
-- ================================================================
-- If type casting still doesn't work, temporarily disable RLS:
-- (Only for testing - re-enable afterwards!)

-- ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY; 
-- ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- Test your app, then re-enable:
-- ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;