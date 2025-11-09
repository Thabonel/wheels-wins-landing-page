-- ============================================
-- SAFE FIX: DROP AND RECREATE ALL RLS POLICIES
-- ============================================
-- This script safely drops existing policies and recreates them
-- Run this in Supabase SQL Editor as a single transaction
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Drop all existing policies (if any)
-- ============================================

-- transition_profiles
DROP POLICY IF EXISTS "Users can view their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can create their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can update their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can delete their own transition profile" ON transition_profiles;

-- transition_answers
DROP POLICY IF EXISTS "Users can view their own transition answers" ON transition_answers;
DROP POLICY IF EXISTS "Users can create their own transition answers" ON transition_answers;
DROP POLICY IF EXISTS "Users can update their own transition answers" ON transition_answers;
DROP POLICY IF EXISTS "Users can delete their own transition answers" ON transition_answers;

-- transition_rooms
DROP POLICY IF EXISTS "Users can view their own transition rooms" ON transition_rooms;
DROP POLICY IF EXISTS "Users can create their own transition rooms" ON transition_rooms;
DROP POLICY IF EXISTS "Users can update their own transition rooms" ON transition_rooms;
DROP POLICY IF EXISTS "Users can delete their own transition rooms" ON transition_rooms;

-- transition_inventory
DROP POLICY IF EXISTS "Users can view their own transition inventory" ON transition_inventory;
DROP POLICY IF EXISTS "Users can create their own transition inventory" ON transition_inventory;
DROP POLICY IF EXISTS "Users can update their own transition inventory" ON transition_inventory;
DROP POLICY IF EXISTS "Users can delete their own transition inventory" ON transition_inventory;


-- ============================================
-- STEP 2: Create all policies fresh
-- ============================================

-- transition_profiles
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

-- transition_answers
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

-- transition_rooms
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

-- transition_inventory
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

COMMIT;

-- ============================================
-- STEP 3: Verify all policies created
-- ============================================

SELECT
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename IN ('transition_profiles', 'transition_answers', 'transition_rooms', 'transition_inventory')
ORDER BY tablename, policyname;

-- Expected: 16 policies total (4 per table)
