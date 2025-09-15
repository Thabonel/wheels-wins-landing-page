-- CASCADE FIX: Remove ALL admin policies and function causing "SET ROLE admin" error
-- This will drop the is_admin_user function AND all 25+ policies that depend on it

-- ================================================================
-- STEP 1: DROP FUNCTION WITH CASCADE (REMOVES ALL DEPENDENT POLICIES)
-- ================================================================
-- This will remove is_admin_user() function AND all policies that use it
-- WARNING: This removes admin access policies from ALL tables
DROP FUNCTION IF EXISTS public.is_admin_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_user(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_user() CASCADE;

-- ================================================================
-- STEP 2: VERIFY THE FUNCTION IS GONE
-- ================================================================
-- Check that is_admin_user function no longer exists
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'is_admin_user'
  AND routine_schema = 'public';
-- This should return no rows

-- ================================================================
-- STEP 3: CHECK WHICH POLICIES WERE REMOVED
-- ================================================================
-- See what policies were dropped (should be much fewer admin policies now)
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE (qual ILIKE '%admin%' OR qual ILIKE '%is_admin_user%')
  AND schemaname = 'public'
ORDER BY tablename, policyname;
-- This should show very few or no results

-- ================================================================
-- STEP 4: TEST CALENDAR EVENT CREATION IMMEDIATELY
-- ================================================================
-- Now test if the error is gone by trying to insert a calendar event
-- (You'll need to test this in your app, not here)

-- ================================================================
-- STEP 5: CREATE MINIMAL ADMIN REPLACEMENT (OPTIONAL)
-- ================================================================
-- If you need admin access later, create a simple function that doesn't cause role switching
-- For now, skip this to ensure the error is completely gone

-- ================================================================
-- STEP 6: VERIFY ALL CORE USER POLICIES STILL EXIST
-- ================================================================
-- Check that user policies for core tables are still in place
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('calendar_events', 'profiles', 'expenses')
  AND schemaname = 'public'
  AND qual NOT ILIKE '%admin%'
ORDER BY tablename, policyname;

-- ================================================================
-- STEP 7: EMERGENCY BACKUP - SIMPLE ADMIN FUNCTION (IF NEEDED LATER)
-- ================================================================
-- If you absolutely need admin functionality later, use this simple version:
-- (DO NOT RUN THIS NOW - only if you need admin access later)

/*
CREATE OR REPLACE FUNCTION public.is_simple_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER  -- IMPORTANT: INVOKER not DEFINER
STABLE
AS $$
  -- Simple check without role switching
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = user_uuid 
    AND email IN ('admin@wheelsandwins.com', 'your-admin-email@example.com')
  );
$$;
*/

-- ================================================================
-- SUMMARY OF WHAT THIS DOES:
-- ================================================================
-- 1. Removes is_admin_user() function that causes "SET ROLE admin" error
-- 2. Automatically removes ALL 25+ policies that depend on it (CASCADE)
-- 3. Keeps all user-level policies for normal operations
-- 4. Completely eliminates the root cause of permission errors
-- 5. Your app should work normally for regular users
-- 6. Admin functionality is temporarily disabled (can be restored later)
--
-- EXPECTED RESULT:
-- - "Failed to save event: permission denied to set role admin" error will be GONE
-- - Calendar events will save properly
-- - Profile updates will work
-- - All user features will function normally
-- - Admin features will be temporarily unavailable
-- ================================================================