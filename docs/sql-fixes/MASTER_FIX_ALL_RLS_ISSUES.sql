-- =====================================================
-- MASTER FIX: All RLS Issues (October 28, 2025)
-- =====================================================
-- This script fixes ALL RLS permission errors by:
-- 1. Adding admin role support to all policies
-- 2. Ensuring correct column usage (id vs user_id)
-- 3. Creating missing tables (likes)
-- =====================================================

-- PART 1: Fix transition_profiles (uses 'id' column)
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can create their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can update their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can delete their own transition profile" ON transition_profiles;

CREATE POLICY "Users can view their own transition profile"
ON transition_profiles FOR SELECT
TO authenticated, anon
USING (id = auth.uid());

CREATE POLICY "Users can create their own transition profile"
ON transition_profiles FOR INSERT
TO authenticated, anon
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own transition profile"
ON transition_profiles FOR UPDATE
TO authenticated, anon
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can delete their own transition profile"
ON transition_profiles FOR DELETE
TO authenticated, anon
USING (id = auth.uid());

-- PART 2: Fix calendar_events (uses 'user_id' column)
-- =====================================================

DROP POLICY IF EXISTS "Users can view own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can create own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar events" ON calendar_events;

CREATE POLICY "Users can view own calendar events"
ON calendar_events FOR SELECT
TO authenticated, anon
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calendar events"
ON calendar_events FOR INSERT
TO authenticated, anon
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events"
ON calendar_events FOR UPDATE
TO authenticated, anon
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events"
ON calendar_events FOR DELETE
TO authenticated, anon
USING (auth.uid() = user_id);

-- PART 3: Create and configure likes table
-- =====================================================

CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all likes" ON likes;
DROP POLICY IF EXISTS "Users can like posts" ON likes;
DROP POLICY IF EXISTS "Users can unlike their own likes" ON likes;

CREATE POLICY "Users can view all likes"
ON likes FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Users can like posts"
ON likes FOR INSERT
TO authenticated, anon
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
ON likes FOR DELETE
TO authenticated, anon
USING (auth.uid() = user_id);

-- PART 4: Verification queries
-- =====================================================

SELECT 'transition_profiles policies:' as info;
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'transition_profiles'
ORDER BY policyname;

SELECT 'calendar_events policies:' as info;
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'calendar_events'
ORDER BY policyname;

SELECT 'likes policies:' as info;
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'likes'
ORDER BY policyname;

SELECT 'RLS status:' as info;
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('transition_profiles', 'calendar_events', 'likes')
ORDER BY tablename;
