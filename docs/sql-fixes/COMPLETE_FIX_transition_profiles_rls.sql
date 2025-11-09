-- ============================================================================
-- COMPLETE FIX: transition_profiles 403 Forbidden Error
-- ============================================================================
-- TWO root causes:
-- 1. RLS policies missing explicit ::text type casting
-- 2. Table-level GRANT statements missing for authenticated/anon roles
-- ============================================================================

-- PART 1: Fix RLS Policies with Type Casting
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can insert their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can update their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can delete their own transition profile" ON transition_profiles;

-- Create policies with explicit type casting (CRITICAL for Supabase REST API)
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

-- PART 2: Grant Table-Level Permissions
GRANT ALL PRIVILEGES ON transition_profiles TO authenticated;
GRANT ALL PRIVILEGES ON transition_profiles TO anon;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify RLS policies have ::text casting
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'transition_profiles';
-- Expected: All policies should have "auth.uid()::text = user_id::text" in qual

-- Verify GRANT permissions
SELECT
    table_name,
    grantee,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'transition_profiles'
AND grantee IN ('authenticated', 'anon')
GROUP BY table_name, grantee
ORDER BY grantee;
-- Expected: 2 rows (authenticated and anon) with DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- ============================================================================
-- Post-Fix Instructions
-- ============================================================================
-- After running this SQL:
-- 1. Log out of the app
-- 2. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
-- 3. Log back in
-- 4. Try the Life Transition Navigator onboarding again
-- ============================================================================
