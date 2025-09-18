-- Fix user_trips Permission Denied Issue
-- The RLS policies are not working properly

-- 1. First, let's check the current state and drop all existing policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on user_trips table
    FOR policy_record IN
        SELECT policyname FROM pg_policies WHERE tablename = 'user_trips'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON user_trips';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- 2. Temporarily disable RLS to test basic access
ALTER TABLE user_trips DISABLE ROW LEVEL SECURITY;

-- 3. Test basic table access (this should work now)
SELECT 'Basic access test' as test, COUNT(*) as row_count FROM user_trips;

-- 4. Re-enable RLS
ALTER TABLE user_trips ENABLE ROW LEVEL SECURITY;

-- 5. Create working RLS policies with proper syntax
-- Allow users to see their own trips
CREATE POLICY "user_trips_select_own" ON user_trips
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- Allow users to insert their own trips
CREATE POLICY "user_trips_insert_own" ON user_trips
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

-- Allow users to update their own trips
CREATE POLICY "user_trips_update_own" ON user_trips
    FOR UPDATE
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- Allow users to delete their own trips
CREATE POLICY "user_trips_delete_own" ON user_trips
    FOR DELETE
    USING (auth.uid()::text = user_id::text);

-- 6. Grant necessary table permissions to authenticated role
GRANT ALL ON user_trips TO authenticated;
GRANT ALL ON user_trips TO anon;

-- 7. Verify the setup
DO $$
DECLARE
    policy_count INTEGER;
    rls_enabled BOOLEAN;
BEGIN
    -- Count policies
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'user_trips';

    -- Check if RLS is enabled
    SELECT rowsecurity INTO rls_enabled FROM pg_tables
    WHERE tablename = 'user_trips' AND schemaname = 'public';

    IF policy_count >= 4 AND rls_enabled THEN
        RAISE NOTICE '✅ SUCCESS: user_trips table has % policies and RLS enabled', policy_count;
    ELSE
        RAISE WARNING '⚠️ Issues found: Policies: %, RLS enabled: %', policy_count, rls_enabled;
    END IF;
END $$;

-- 8. Show final state
SELECT 'Final Policy Check' as check_type, policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'user_trips'
ORDER BY policyname;