-- Community Tips & Contribution System
-- Enables users to share knowledge and track their impact
-- Created: January 12, 2025

-- ============================================================================
-- Table: community_tips
-- Stores user-contributed tips that PAM can use to help others
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.community_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Tip content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'camping',
        'gas_savings',
        'route_planning',
        'maintenance',
        'safety',
        'cooking',
        'weather',
        'attractions',
        'budget',
        'general'
    )),

    -- Location context (optional)
    location_name TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),

    -- Impact tracking
    view_count INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0, -- Times PAM used this tip in responses
    helpful_count INTEGER DEFAULT 0, -- User upvotes

    -- Metadata
    tags TEXT[], -- Searchable tags
    is_verified BOOLEAN DEFAULT false, -- Admin verified quality
    is_featured BOOLEAN DEFAULT false, -- Featured on homepage
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'flagged')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE -- When PAM last used this tip
);

-- ============================================================================
-- Table: tip_usage_log
-- Tracks when PAM uses a tip to help someone
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tip_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_id UUID NOT NULL REFERENCES public.community_tips(id) ON DELETE CASCADE,
    contributor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    beneficiary_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who received the tip

    -- Context
    conversation_id UUID, -- Which PAM conversation
    pam_response TEXT, -- How PAM used the tip

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Table: user_contribution_stats
-- Aggregated stats for quick dashboard display
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_contribution_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Contribution counts
    tips_shared INTEGER DEFAULT 0,
    people_helped INTEGER DEFAULT 0, -- Unique beneficiaries
    total_tip_uses INTEGER DEFAULT 0,

    -- Recognition
    badges JSONB DEFAULT '[]', -- Array of earned badges
    reputation_level INTEGER DEFAULT 1,
    reputation_points INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Search tips by category and status
CREATE INDEX IF NOT EXISTS idx_community_tips_category ON public.community_tips(category) WHERE status = 'active';

-- Search tips by user
CREATE INDEX IF NOT EXISTS idx_community_tips_user_id ON public.community_tips(user_id);

-- Search tips by location (for geo-based queries)
CREATE INDEX IF NOT EXISTS idx_community_tips_location ON public.community_tips(location_lat, location_lng) WHERE location_lat IS NOT NULL;

-- Search tips by tags (GIN index for array search)
CREATE INDEX IF NOT EXISTS idx_community_tips_tags ON public.community_tips USING GIN(tags);

-- Full-text search on title and content
CREATE INDEX IF NOT EXISTS idx_community_tips_search ON public.community_tips USING GIN(
    to_tsvector('english', title || ' ' || content)
);

-- Usage log queries
CREATE INDEX IF NOT EXISTS idx_tip_usage_log_tip_id ON public.tip_usage_log(tip_id);
CREATE INDEX IF NOT EXISTS idx_tip_usage_log_contributor ON public.tip_usage_log(contributor_id);
CREATE INDEX IF NOT EXISTS idx_tip_usage_log_beneficiary ON public.tip_usage_log(beneficiary_id);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.community_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tip_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_contribution_stats ENABLE ROW LEVEL SECURITY;

-- Community Tips Policies
-- Anyone authenticated can view active tips
CREATE POLICY "Anyone can view active tips"
ON public.community_tips FOR SELECT
USING (
    auth.role() = 'authenticated'
    AND status = 'active'
);

-- Users can create their own tips
CREATE POLICY "Users can create own tips"
ON public.community_tips FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own tips
CREATE POLICY "Users can update own tips"
ON public.community_tips FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own tips
CREATE POLICY "Users can delete own tips"
ON public.community_tips FOR DELETE
USING (auth.uid() = user_id);

-- Service role can manage all tips (for PAM)
CREATE POLICY "Service role can manage all tips"
ON public.community_tips FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Tip Usage Log Policies
-- Users can view logs about their tips
CREATE POLICY "Users can view logs about their tips"
ON public.tip_usage_log FOR SELECT
USING (
    auth.uid() = contributor_id
    OR auth.uid() = beneficiary_id
);

-- Service role can insert usage logs (PAM)
CREATE POLICY "Service role can insert usage logs"
ON public.tip_usage_log FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Contribution Stats Policies
-- Users can view their own stats
CREATE POLICY "Users can view own stats"
ON public.user_contribution_stats FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage stats
CREATE POLICY "Service role can manage stats"
ON public.user_contribution_stats FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Functions & Triggers
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_community_tips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_community_tips_updated_at
    BEFORE UPDATE ON public.community_tips
    FOR EACH ROW
    EXECUTE FUNCTION update_community_tips_updated_at();

-- Auto-create stats row when user creates first tip
CREATE OR REPLACE FUNCTION create_user_stats_on_first_tip()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_contribution_stats (user_id, tips_shared)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
        tips_shared = user_contribution_stats.tips_shared + 1,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_stats_on_first_tip
    AFTER INSERT ON public.community_tips
    FOR EACH ROW
    EXECUTE FUNCTION create_user_stats_on_first_tip();

-- Update stats when tip is used
CREATE OR REPLACE FUNCTION update_stats_on_tip_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment tip usage count
    UPDATE public.community_tips
    SET
        use_count = use_count + 1,
        last_used_at = NOW()
    WHERE id = NEW.tip_id;

    -- Update contributor stats
    UPDATE public.user_contribution_stats
    SET
        total_tip_uses = total_tip_uses + 1,
        people_helped = (
            SELECT COUNT(DISTINCT beneficiary_id)
            FROM public.tip_usage_log
            WHERE contributor_id = NEW.contributor_id
            AND beneficiary_id IS NOT NULL
        ),
        reputation_points = reputation_points + 10, -- 10 points per use
        updated_at = NOW()
    WHERE user_id = NEW.contributor_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stats_on_tip_usage
    AFTER INSERT ON public.tip_usage_log
    FOR EACH ROW
    EXECUTE FUNCTION update_stats_on_tip_usage();

-- ============================================================================
-- Helper Functions for PAM
-- ============================================================================

-- Search tips by keyword
CREATE OR REPLACE FUNCTION search_community_tips(
    p_query TEXT,
    p_category TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    contributor_username TEXT,
    use_count INTEGER,
    helpful_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ct.id,
        ct.title,
        ct.content,
        ct.category,
        COALESCE(p.username, 'Anonymous') as contributor_username,
        ct.use_count,
        ct.helpful_count
    FROM public.community_tips ct
    LEFT JOIN public.profiles p ON p.user_id = ct.user_id
    WHERE
        ct.status = 'active'
        AND (p_category IS NULL OR ct.category = p_category)
        AND (
            to_tsvector('english', ct.title || ' ' || ct.content) @@ plainto_tsquery('english', p_query)
            OR ct.tags && ARRAY[p_query]::TEXT[]
        )
    ORDER BY
        ct.helpful_count DESC,
        ct.use_count DESC,
        ct.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's contribution stats
CREATE OR REPLACE FUNCTION get_user_contribution_stats(p_user_id UUID)
RETURNS TABLE (
    tips_shared INTEGER,
    people_helped INTEGER,
    total_tip_uses INTEGER,
    reputation_level INTEGER,
    badges JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(s.tips_shared, 0),
        COALESCE(s.people_helped, 0),
        COALESCE(s.total_tip_uses, 0),
        COALESCE(s.reputation_level, 1),
        COALESCE(s.badges, '[]'::JSONB)
    FROM public.user_contribution_stats s
    WHERE s.user_id = p_user_id;

    -- Return zeros if no stats exist yet
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 0, 1, '[]'::JSONB;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get community stats for homepage
CREATE OR REPLACE FUNCTION get_community_stats()
RETURNS TABLE (
    total_tips INTEGER,
    total_contributors INTEGER,
    total_people_helped INTEGER,
    total_tip_uses INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT ct.id)::INTEGER as total_tips,
        COUNT(DISTINCT ct.user_id)::INTEGER as total_contributors,
        SUM(s.people_helped)::INTEGER as total_people_helped,
        SUM(s.total_tip_uses)::INTEGER as total_tip_uses
    FROM public.community_tips ct
    LEFT JOIN public.user_contribution_stats s ON s.user_id = ct.user_id
    WHERE ct.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT SELECT ON public.community_tips TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_tips TO authenticated;

GRANT SELECT ON public.tip_usage_log TO authenticated;

GRANT SELECT ON public.user_contribution_stats TO authenticated;

-- Service role needs full access for PAM
GRANT ALL ON public.community_tips TO service_role;
GRANT ALL ON public.tip_usage_log TO service_role;
GRANT ALL ON public.user_contribution_stats TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION search_community_tips TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_contribution_stats TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_community_stats TO authenticated, service_role;

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Insert sample tip (will be replaced by real user contributions)
-- Commented out - uncomment to add sample data
/*
INSERT INTO public.community_tips (
    user_id,
    title,
    content,
    category,
    location_name,
    tags
) VALUES (
    (SELECT id FROM auth.users LIMIT 1), -- Use first user as example
    'Yellowstone fills up early in summer',
    'If you''re visiting Yellowstone in June-August, arrive at Fishing Bridge RV Park before 8am or you won''t get a spot. Alternatively, book 6 months in advance.',
    'camping',
    'Yellowstone National Park',
    ARRAY['yellowstone', 'camping', 'summer', 'early_arrival']
);
*/

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.community_tips IS 'User-contributed tips that PAM uses to help other travelers';
COMMENT ON TABLE public.tip_usage_log IS 'Tracks when PAM uses a community tip to help someone';
COMMENT ON TABLE public.user_contribution_stats IS 'Aggregated contribution statistics for user dashboards';

COMMENT ON COLUMN public.community_tips.use_count IS 'Number of times PAM used this tip in responses';
COMMENT ON COLUMN public.community_tips.helpful_count IS 'Number of user upvotes (future feature)';
COMMENT ON COLUMN public.user_contribution_stats.people_helped IS 'Count of unique users who benefited from this contributor''s tips';
COMMENT ON COLUMN public.user_contribution_stats.reputation_points IS 'Points earned from contributions (10 per tip use)';
