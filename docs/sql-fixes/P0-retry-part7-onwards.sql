-- Retry SQL: Only PARTS 7, 9, 10 (parts that failed or were skipped)
-- Parts 1-4 succeeded on first run, Parts 5-6 succeeded on second run
-- Part 7 failed due to seller_id (should be user_id), Part 8 removed (table doesn't exist)
-- Date: 2026-02-12

-- ============================================================
-- PART 7 (FIXED): Fix Marketplace Listings RLS
-- Actual column is user_id (NOT seller_id)
-- ============================================================

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can view active listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can manage own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can create listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can update own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON public.marketplace_listings;

CREATE POLICY "Anyone can view active listings" ON public.marketplace_listings
    FOR SELECT USING (
        status = 'active'
        OR (select auth.uid())::uuid = user_id
    );

CREATE POLICY "Users can create listings" ON public.marketplace_listings
    FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can update own listings" ON public.marketplace_listings
    FOR UPDATE USING ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can delete own listings" ON public.marketplace_listings
    FOR DELETE USING ((select auth.uid())::uuid = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT SELECT ON public.marketplace_listings TO anon;

-- ============================================================
-- PART 9: Fix Hustle Ideas (public read, auth write)
-- ============================================================

ALTER TABLE public.hustle_ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved hustles" ON public.hustle_ideas;
DROP POLICY IF EXISTS "Authenticated users can create hustles" ON public.hustle_ideas;

CREATE POLICY "Anyone can view approved hustles" ON public.hustle_ideas
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create hustles" ON public.hustle_ideas
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

GRANT SELECT ON public.hustle_ideas TO authenticated, anon;
GRANT INSERT ON public.hustle_ideas TO authenticated;

-- ============================================================
-- PART 10: Fix Income Entries RLS (for financial summary)
-- ============================================================

DROP POLICY IF EXISTS "Users can manage own income" ON income_entries;
DROP POLICY IF EXISTS "Users can view own income" ON income_entries;
DROP POLICY IF EXISTS "Users can insert own income" ON income_entries;
DROP POLICY IF EXISTS "Users can update own income" ON income_entries;
DROP POLICY IF EXISTS "Users can delete own income" ON income_entries;

ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own income" ON income_entries
FOR SELECT USING ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can insert own income" ON income_entries
FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can update own income" ON income_entries
FOR UPDATE USING ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can delete own income" ON income_entries
FOR DELETE USING ((select auth.uid())::uuid = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON income_entries TO authenticated;

-- ============================================================
-- VERIFICATION: Check all policies across all tables
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
