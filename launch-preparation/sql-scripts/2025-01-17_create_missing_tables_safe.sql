-- Create Missing Database Tables for Wheels & Wins Launch (SAFE VERSION)
-- Date: January 17, 2025
-- Tables: user_subscriptions, budgets, income_entries, posts, user_wishlists, trip_template_ratings

-- 1. USER_SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    trial_end TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can insert their own subscriptions" ON public.user_subscriptions
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can update their own subscriptions" ON public.user_subscriptions
FOR UPDATE USING (auth.uid() = user_id);

-- 2. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Monthly Budget',
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    period TEXT DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
    category TEXT DEFAULT 'general',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON public.budgets(period);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON public.budgets(category);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own budgets" ON public.budgets;
CREATE POLICY "Users can view their own budgets" ON public.budgets
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own budgets" ON public.budgets;
CREATE POLICY "Users can insert their own budgets" ON public.budgets
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own budgets" ON public.budgets;
CREATE POLICY "Users can update their own budgets" ON public.budgets
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own budgets" ON public.budgets;
CREATE POLICY "Users can delete their own budgets" ON public.budgets
FOR DELETE USING (auth.uid() = user_id);

-- 3. INCOME_ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.income_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    source TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT DEFAULT 'income' CHECK (type IN ('income', 'bonus', 'freelance', 'investment', 'other')),
    description TEXT,
    category TEXT DEFAULT 'general',
    is_recurring BOOLEAN DEFAULT false,
    frequency TEXT CHECK (frequency IN ('weekly', 'monthly', 'yearly') OR frequency IS NULL),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_entries_user_id ON public.income_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_date ON public.income_entries(date);
CREATE INDEX IF NOT EXISTS idx_income_entries_type ON public.income_entries(type);

ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own income entries" ON public.income_entries;
CREATE POLICY "Users can view their own income entries" ON public.income_entries
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own income entries" ON public.income_entries;
CREATE POLICY "Users can insert their own income entries" ON public.income_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own income entries" ON public.income_entries;
CREATE POLICY "Users can update their own income entries" ON public.income_entries
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own income entries" ON public.income_entries;
CREATE POLICY "Users can delete their own income entries" ON public.income_entries
FOR DELETE USING (auth.uid() = user_id);

-- 4. POSTS TABLE (Social Features)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    post_type TEXT DEFAULT 'general' CHECK (post_type IN ('general', 'trip_share', 'question', 'tip', 'review')),
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
    location TEXT,
    coordinates GEOGRAPHY(POINT, 4326),
    images TEXT[],
    tags TEXT[],
    trip_id UUID,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON public.posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON public.posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public posts" ON public.posts;
CREATE POLICY "Users can view public posts" ON public.posts
FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
CREATE POLICY "Users can insert their own posts" ON public.posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts" ON public.posts
FOR DELETE USING (auth.uid() = user_id);

-- 5. USER_WISHLISTS TABLE
CREATE TABLE IF NOT EXISTS public.user_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Wishlist',
    description TEXT,
    category TEXT DEFAULT 'general',
    items JSONB DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    target_date DATE,
    estimated_cost NUMERIC CHECK (estimated_cost >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON public.user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_category ON public.user_wishlists(category);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_priority ON public.user_wishlists(priority);

ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wishlists" ON public.user_wishlists;
CREATE POLICY "Users can view their own wishlists" ON public.user_wishlists
FOR SELECT USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Users can insert their own wishlists" ON public.user_wishlists;
CREATE POLICY "Users can insert their own wishlists" ON public.user_wishlists
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own wishlists" ON public.user_wishlists;
CREATE POLICY "Users can update their own wishlists" ON public.user_wishlists
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own wishlists" ON public.user_wishlists;
CREATE POLICY "Users can delete their own wishlists" ON public.user_wishlists
FOR DELETE USING (auth.uid() = user_id);

-- 6. TRIP_TEMPLATE_RATINGS TABLE
CREATE TABLE IF NOT EXISTS public.trip_template_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    helpful_votes INTEGER DEFAULT 0,
    verified_traveler BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_template_ratings_template_id ON public.trip_template_ratings(template_id);
CREATE INDEX IF NOT EXISTS idx_trip_template_ratings_user_id ON public.trip_template_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_template_ratings_rating ON public.trip_template_ratings(rating);

ALTER TABLE public.trip_template_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all ratings" ON public.trip_template_ratings;
CREATE POLICY "Users can view all ratings" ON public.trip_template_ratings
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own ratings" ON public.trip_template_ratings;
CREATE POLICY "Users can insert their own ratings" ON public.trip_template_ratings
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ratings" ON public.trip_template_ratings;
CREATE POLICY "Users can update their own ratings" ON public.trip_template_ratings
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.trip_template_ratings;
CREATE POLICY "Users can delete their own ratings" ON public.trip_template_ratings
FOR DELETE USING (auth.uid() = user_id);

-- CREATE UPDATE TRIGGERS (SAFE VERSION)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budgets_updated_at ON public.budgets;
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_income_entries_updated_at ON public.income_entries;
CREATE TRIGGER update_income_entries_updated_at BEFORE UPDATE ON public.income_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_wishlists_updated_at ON public.user_wishlists;
CREATE TRIGGER update_user_wishlists_updated_at BEFORE UPDATE ON public.user_wishlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_template_ratings_updated_at ON public.trip_template_ratings;
CREATE TRIGGER update_trip_template_ratings_updated_at BEFORE UPDATE ON public.trip_template_ratings FOR EACH ROW EXECUTE FUNCTION update_trip_template_ratings_updated_at();

-- GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wishlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_template_ratings TO authenticated;