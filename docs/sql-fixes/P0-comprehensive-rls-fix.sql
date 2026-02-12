-- P0-1 + P0-2: Comprehensive RLS Fix for Expenses and Social Features
-- Run this in Supabase SQL Editor as a single batch
-- Date: 2026-02-12
-- Fixes: Expense saving (UUID type mismatch), Social features RLS

-- ============================================================
-- PART 1: Fix Expenses RLS (P0-1)
-- Problem: auth.uid() cast to TEXT but user_id is UUID
-- ============================================================

DROP POLICY IF EXISTS "expenses_fixed_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_simple_user_policy" ON expenses;
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON expenses
FOR SELECT USING ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can insert own expenses" ON expenses
FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
FOR UPDATE USING ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
FOR DELETE USING ((select auth.uid())::uuid = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO authenticated;

-- ============================================================
-- PART 2: Fix Social Posts RLS (P0-2)
-- Problem: Policies may be missing or have wrong UUID casting
-- ============================================================

-- Ensure social_posts table exists
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  location TEXT DEFAULT 'feed' CHECK (location IN ('feed', 'group', 'profile')),
  group_id UUID,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(status);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.social_posts;

CREATE POLICY "Anyone can view approved posts" ON public.social_posts
    FOR SELECT USING (
        status = 'approved'
        OR ((select auth.uid())::uuid = user_id)
    );

CREATE POLICY "Users can create posts" ON public.social_posts
    FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can update their own posts" ON public.social_posts
    FOR UPDATE USING ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can delete their own posts" ON public.social_posts
    FOR DELETE USING ((select auth.uid())::uuid = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT SELECT ON public.social_posts TO anon;

-- ============================================================
-- PART 3: Fix Post Votes RLS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON public.post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON public.post_votes(user_id);

ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all votes" ON public.post_votes;
DROP POLICY IF EXISTS "Users can create their own votes" ON public.post_votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.post_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.post_votes;

CREATE POLICY "Users can view all votes" ON public.post_votes
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own votes" ON public.post_votes
    FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can update their own votes" ON public.post_votes
    FOR UPDATE USING ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can delete their own votes" ON public.post_votes
    FOR DELETE USING ((select auth.uid())::uuid = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_votes TO authenticated;
GRANT SELECT ON public.post_votes TO anon;

-- ============================================================
-- PART 4: Fix Post Comments RLS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;

CREATE POLICY "Anyone can view comments" ON public.post_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON public.post_comments
    FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can update own comments" ON public.post_comments
    FOR UPDATE USING ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can delete own comments" ON public.post_comments
    FOR DELETE USING ((select auth.uid())::uuid = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT SELECT ON public.post_comments TO anon;

-- ============================================================
-- PART 5: Fix Social Groups RLS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.social_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  member_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.social_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view groups" ON public.social_groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.social_groups;
DROP POLICY IF EXISTS "Group creators can update" ON public.social_groups;

CREATE POLICY "Anyone can view groups" ON public.social_groups
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create groups" ON public.social_groups
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Group creators can update" ON public.social_groups
    FOR UPDATE USING ((select auth.uid())::uuid = created_by);

GRANT SELECT, INSERT, UPDATE ON public.social_groups TO authenticated;
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
-- ============================================================

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    category TEXT,
    condition TEXT DEFAULT 'used' CHECK (condition IN ('new', 'used', 'refurbished')),
    location TEXT,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft', 'expired')),
    images JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON public.marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON public.marketplace_listings(status);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can create listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can update own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON public.marketplace_listings;

CREATE POLICY "Anyone can view active listings" ON public.marketplace_listings
    FOR SELECT USING (
        status = 'active'
        OR (select auth.uid())::uuid = seller_id
    );

CREATE POLICY "Users can create listings" ON public.marketplace_listings
    FOR INSERT WITH CHECK ((select auth.uid())::uuid = seller_id);

CREATE POLICY "Users can update own listings" ON public.marketplace_listings
    FOR UPDATE USING ((select auth.uid())::uuid = seller_id);

CREATE POLICY "Users can delete own listings" ON public.marketplace_listings
    FOR DELETE USING ((select auth.uid())::uuid = seller_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT SELECT ON public.marketplace_listings TO anon;

-- ============================================================
-- PART 8: Fix Marketplace Favorites RLS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.marketplace_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_user_id ON public.marketplace_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_listing_id ON public.marketplace_favorites(listing_id);

ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON public.marketplace_favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON public.marketplace_favorites;
DROP POLICY IF EXISTS "Users can remove favorites" ON public.marketplace_favorites;

CREATE POLICY "Users can view own favorites" ON public.marketplace_favorites
    FOR SELECT USING ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can add favorites" ON public.marketplace_favorites
    FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can remove favorites" ON public.marketplace_favorites
    FOR DELETE USING ((select auth.uid())::uuid = user_id);

GRANT SELECT, INSERT, DELETE ON public.marketplace_favorites TO authenticated;

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
    'marketplace_listings', 'marketplace_favorites',
    'hustle_ideas'
)
ORDER BY tablename, policyname;
