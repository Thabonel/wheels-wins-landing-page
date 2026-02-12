-- Fix for PART 5 failure: social_groups uses owner_id, not created_by
-- Run this after the main P0-comprehensive-rls-fix.sql errored on PART 5
-- This covers PART 5 onwards (everything that was skipped due to the error)
-- Date: 2026-02-12

-- ============================================================
-- PART 5 (FIXED): Fix Social Groups RLS
-- Table already exists with owner_id column
-- ============================================================

ALTER TABLE public.social_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view groups" ON public.social_groups;
DROP POLICY IF EXISTS "Users can view public groups" ON public.social_groups;
DROP POLICY IF EXISTS "Group members can view private groups" ON public.social_groups;
DROP POLICY IF EXISTS "Group owners can manage groups" ON public.social_groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.social_groups;
DROP POLICY IF EXISTS "Group creators can update" ON public.social_groups;
DROP POLICY IF EXISTS "Group owners can update" ON public.social_groups;
DROP POLICY IF EXISTS "Group owners can delete" ON public.social_groups;

CREATE POLICY "Anyone can view groups" ON public.social_groups
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create groups" ON public.social_groups
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Group owners can update" ON public.social_groups
    FOR UPDATE USING ((select auth.uid())::uuid = owner_id);

CREATE POLICY "Group owners can delete" ON public.social_groups
    FOR DELETE USING ((select auth.uid())::uuid = owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_groups TO authenticated;
GRANT SELECT ON public.social_groups TO anon;

-- ============================================================
-- PART 6: Fix Social Group Members RLS
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_memberships')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_group_members') THEN
        ALTER TABLE public.group_memberships RENAME TO social_group_members;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.social_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_group_members_group_id ON public.social_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_social_group_members_user_id ON public.social_group_members(user_id);

ALTER TABLE public.social_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view group members" ON public.social_group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.social_group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.social_group_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.social_group_members;
DROP POLICY IF EXISTS "Group members can view membership" ON public.social_group_members;

CREATE POLICY "Anyone can view group members" ON public.social_group_members
    FOR SELECT USING (true);

CREATE POLICY "Users can join groups" ON public.social_group_members
    FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can update own membership" ON public.social_group_members
    FOR UPDATE USING ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can leave groups" ON public.social_group_members
    FOR DELETE USING ((select auth.uid())::uuid = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_group_members TO authenticated;
GRANT SELECT ON public.social_group_members TO anon;

-- ============================================================
-- PART 7: Fix Marketplace Listings RLS
-- Table already exists with user_id column (NOT seller_id)
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

-- NOTE: Skipping marketplace_favorites - table does not exist in DB
-- (DB uses user_wishlists instead, which already has RLS from migration)

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
-- VERIFICATION: Check all policies were created correctly
-- ============================================================

SELECT tablename, policyname, cmd, qual
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
