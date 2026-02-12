-- Cleanup: Remove duplicate RLS policies
-- Keeps the newer policies (proper UUID casting) and drops the old duplicates
-- Date: 2026-02-12

-- ============================================================
-- income_entries: Drop old duplicates (keep new ones)
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own income" ON income_entries;
DROP POLICY IF EXISTS "Users can create their own income entries" ON income_entries;
DROP POLICY IF EXISTS "Users can update their own income" ON income_entries;
DROP POLICY IF EXISTS "Users can delete their own income" ON income_entries;

-- ============================================================
-- marketplace_listings: Drop old duplicates (keep new ones)
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can create their own listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON marketplace_listings;

-- ============================================================
-- hustle_ideas: Drop old duplicates (keep new ones)
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view approved hustle ideas" ON hustle_ideas;
DROP POLICY IF EXISTS "Users can create hustle ideas" ON hustle_ideas;
DROP POLICY IF EXISTS "Users can update own hustle ideas" ON hustle_ideas;

-- ============================================================
-- VERIFICATION: Confirm clean policy set
-- ============================================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'expenses', 'income_entries',
    'social_posts', 'post_votes', 'post_comments',
    'social_groups', 'social_group_members',
    'marketplace_listings',
    'hustle_ideas'
)
ORDER BY tablename, policyname;
