-- ============================================
-- CREATE RLS POLICIES FOR TRANSITION MODULE
-- ============================================
-- Run this in Supabase SQL Editor
-- Tables: transition_profiles, transition_answers, transition_rooms, transition_inventory
-- Status: RLS enabled, NO policies exist
-- ============================================

-- POLICY SET 1: transition_profiles
-- ============================================

CREATE POLICY "Users can view their own transition profile"
ON transition_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transition profile"
ON transition_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transition profile"
ON transition_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transition profile"
ON transition_profiles FOR DELETE
USING (auth.uid() = user_id);


-- POLICY SET 2: transition_answers
-- ============================================

CREATE POLICY "Users can view their own transition answers"
ON transition_answers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transition answers"
ON transition_answers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transition answers"
ON transition_answers FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transition answers"
ON transition_answers FOR DELETE
USING (auth.uid() = user_id);


-- POLICY SET 3: transition_rooms
-- ============================================

CREATE POLICY "Users can view their own transition rooms"
ON transition_rooms FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transition rooms"
ON transition_rooms FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transition rooms"
ON transition_rooms FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transition rooms"
ON transition_rooms FOR DELETE
USING (auth.uid() = user_id);


-- POLICY SET 4: transition_inventory
-- ============================================

CREATE POLICY "Users can view their own transition inventory"
ON transition_inventory FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transition inventory"
ON transition_inventory FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transition inventory"
ON transition_inventory FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transition inventory"
ON transition_inventory FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this after creating policies to verify:

SELECT
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename IN ('transition_profiles', 'transition_answers', 'transition_rooms', 'transition_inventory')
ORDER BY tablename, policyname;

-- Expected: 16 policies total (4 per table)
