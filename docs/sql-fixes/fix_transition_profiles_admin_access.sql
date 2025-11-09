DROP POLICY IF EXISTS "Users can view their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can create their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can update their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can delete their own transition profile" ON transition_profiles;

CREATE POLICY "Users can view their own transition profile"
ON transition_profiles FOR SELECT
TO authenticated, anon, admin
USING (id = auth.uid());

CREATE POLICY "Users can create their own transition profile"
ON transition_profiles FOR INSERT
TO authenticated, anon, admin
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own transition profile"
ON transition_profiles FOR UPDATE
TO authenticated, anon, admin
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can delete their own transition profile"
ON transition_profiles FOR DELETE
TO authenticated, anon, admin
USING (id = auth.uid());

SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'transition_profiles'
ORDER BY policyname;
