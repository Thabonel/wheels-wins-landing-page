-- ============================================
-- OPTIONAL: Remove duplicate SELECT policy
-- ============================================
-- There are 2 SELECT policies, we only need 1
-- This removes the older one
-- ============================================

-- Drop the older SELECT policy (plural "profiles")
DROP POLICY IF EXISTS "Users can view own transition profiles" ON transition_profiles;

-- Keep the newer one: "Users can view their own transition profile"

-- Verify only 4 policies remain
SELECT
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename = 'transition_profiles'
ORDER BY policyname;

-- Expected: 4 policies (create, delete, update, view)
