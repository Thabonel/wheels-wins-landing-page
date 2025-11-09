-- ============================================
-- RLS POLICIES FOR transition_profiles TABLE
-- ============================================
-- Table exists with RLS enabled but NO policies
-- This script adds the missing policies
-- ============================================

BEGIN;

-- Drop existing policies if any (from partial previous runs)
DROP POLICY IF EXISTS "Users can view their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can create their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can update their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can delete their own transition profile" ON transition_profiles;

-- Create policies for transition_profiles
CREATE POLICY "Users can view their own transition profile"
ON transition_profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can create their own transition profile"
ON transition_profiles FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own transition profile"
ON transition_profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can delete their own transition profile"
ON transition_profiles FOR DELETE
USING (id = auth.uid());

COMMIT;

-- Verify policies created
SELECT
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename = 'transition_profiles'
ORDER BY policyname;

-- Expected: 4 policies
