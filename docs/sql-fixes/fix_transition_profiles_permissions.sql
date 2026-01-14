-- Fix transition_profiles RLS and permissions
-- Issue: Users getting "Failed to update settings" when saving transition settings
-- Root Cause: Missing UPDATE policy or GRANT permissions

-- 1. Drop existing policies to start clean
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transition_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.transition_profiles', pol.policyname);
  END LOOP;
END $$;

-- 2. Recreate RLS policies with explicit type casting (fixes REST API issues)
CREATE POLICY "Users can view their own transition profile"
ON transition_profiles FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own transition profile"
ON transition_profiles FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own transition profile"
ON transition_profiles FOR UPDATE
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own transition profile"
ON transition_profiles FOR DELETE
USING (auth.uid()::text = user_id::text);

-- 3. Ensure RLS is enabled
ALTER TABLE transition_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Grant necessary permissions to authenticated users
GRANT ALL ON transition_profiles TO authenticated;
GRANT ALL ON transition_profiles TO anon;

-- 5. Verify the fix
SELECT 'Policies created:' as status, COUNT(*) as count
FROM pg_policies
WHERE tablename = 'transition_profiles';

SELECT 'Permissions granted:' as status, grantee, string_agg(privilege_type, ', ') as privileges
FROM information_schema.table_privileges
WHERE table_name = 'transition_profiles'
AND grantee IN ('authenticated', 'anon')
GROUP BY grantee;
