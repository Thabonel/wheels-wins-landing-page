DROP POLICY IF EXISTS "Users can view their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can create their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can update their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can delete their own transition profile" ON transition_profiles;

CREATE POLICY "Users can view their own transition profile"
ON transition_profiles FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own transition profile"
ON transition_profiles FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own transition profile"
ON transition_profiles FOR UPDATE
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own transition profile"
ON transition_profiles FOR DELETE
USING (auth.uid()::text = user_id::text);

SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'transition_profiles';
