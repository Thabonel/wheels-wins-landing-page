-- Fix Social Features Database Dependencies
-- Create missing tables that are causing social features to fail

-- 1. USER FRIENDSHIPS TABLE - Core friendship system
CREATE TABLE IF NOT EXISTS public.user_friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    message TEXT, -- Optional message with friend request
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

-- 2. USER FOLLOWS TABLE - Follow/follower relationships  
CREATE TABLE IF NOT EXISTS public.user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Prevent users from following themselves
    CONSTRAINT no_self_follow CHECK (follower_id != following_id),
    UNIQUE(follower_id, following_id)
);

-- 3. SOCIAL INTERACTIONS TABLE - Track all social interactions
CREATE TABLE IF NOT EXISTS public.social_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'follow', 'comment', 'share', 'friend_request', 'message', 'mention')),
    content_type TEXT, -- 'post', 'comment', 'group', 'event', etc.
    content_id UUID,
    metadata JSONB DEFAULT '{}', -- Additional interaction data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. GROUP EVENTS TABLE - Group events and meetups
CREATE TABLE IF NOT EXISTS public.group_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT DEFAULT 'meetup' CHECK (event_type IN ('meetup', 'trip', 'workshop', 'social', 'maintenance', 'rally', 'other')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    
    -- Location can be physical address or coordinates
    location JSONB, -- {address: "...", lat: x, lng: y, venue: "..."}
    
    -- Event logistics
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    requirements TEXT[], -- ["RV Required", "Boondocking Experience", etc.]
    cost_per_person DECIMAL(10,2) DEFAULT 0.00,
    
    -- Event management
    organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
    visibility TEXT DEFAULT 'group_only' CHECK (visibility IN ('public', 'group_only', 'invite_only')),
    
    -- Additional event data
    tags TEXT[], -- ["family-friendly", "pets-welcome", etc.]
    external_links JSONB DEFAULT '{}', -- Facebook event, Meetup.com, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. EVENT ATTENDEES TABLE - Event attendance tracking
CREATE TABLE IF NOT EXISTS public.event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'going' CHECK (status IN ('interested', 'going', 'not_going', 'maybe')),
    rsvp_message TEXT, -- Optional message from attendee
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- 6. MODERATION QUEUE TABLE - Content moderation and reports
CREATE TABLE IF NOT EXISTS public.moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'user', 'group', 'event', 'message')),
    content_id UUID NOT NULL,
    reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('spam', 'inappropriate', 'harassment', 'misinformation', 'copyright', 'violence', 'other')),
    description TEXT,
    
    -- Moderation workflow
    priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed', 'escalated')),
    
    -- Moderator handling
    moderator_id UUID REFERENCES auth.users(id),
    moderator_notes TEXT,
    moderator_action TEXT, -- 'warn', 'suspend', 'remove_content', 'no_action', etc.
    
    -- Additional context
    evidence_urls TEXT[], -- Screenshots, links, etc.
    automated_flags JSONB DEFAULT '{}', -- AI/automated detection results
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TRUST SCORES TABLE - User trust and reputation system
CREATE TABLE IF NOT EXISTS public.trust_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    overall_score DECIMAL(5,2) DEFAULT 50.0 CHECK (overall_score >= 0 AND overall_score <= 100),
    
    -- Score breakdown
    community_score DECIMAL(5,2) DEFAULT 50.0, -- Community participation
    reliability_score DECIMAL(5,2) DEFAULT 50.0, -- Event attendance, commitments
    helpfulness_score DECIMAL(5,2) DEFAULT 50.0, -- Helpful posts, answers
    
    -- Score factors (stored as JSON for flexibility)
    factors JSONB DEFAULT '{}', -- {posts_created: 10, events_attended: 5, reports_resolved: 2}
    
    -- Calculation metadata
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    calculation_version INTEGER DEFAULT 1, -- Track algorithm versions
    total_interactions INTEGER DEFAULT 0,
    
    UNIQUE(user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_friendships_requester ON public.user_friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_user_friendships_addressee ON public.user_friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_user_friendships_status ON public.user_friendships(status);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);

CREATE INDEX IF NOT EXISTS idx_social_interactions_user ON public.social_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_target ON public.social_interactions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_type ON public.social_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_social_interactions_content ON public.social_interactions(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_created ON public.social_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_events_group ON public.group_events(group_id);
CREATE INDEX IF NOT EXISTS idx_group_events_organizer ON public.group_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_group_events_status ON public.group_events(status);
CREATE INDEX IF NOT EXISTS idx_group_events_start_date ON public.group_events(start_date);
CREATE INDEX IF NOT EXISTS idx_group_events_type ON public.group_events(event_type);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON public.event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON public.event_attendees(status);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON public.moderation_queue(priority_level);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_content ON public.moderation_queue(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_reporter ON public.moderation_queue(reported_by);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_moderator ON public.moderation_queue(moderator_id);

CREATE INDEX IF NOT EXISTS idx_trust_scores_overall ON public.trust_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_trust_scores_user ON public.trust_scores(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_friendships
CREATE POLICY "Users can view their own friendships" ON public.user_friendships
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can create friend requests" ON public.user_friendships
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their friendships" ON public.user_friendships
    FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- RLS Policies for user_follows
CREATE POLICY "Users can view all follows" ON public.user_follows
    FOR SELECT USING (true); -- Public follow relationships

CREATE POLICY "Users can create their own follows" ON public.user_follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows" ON public.user_follows
    FOR DELETE USING (auth.uid() = follower_id);

-- RLS Policies for social_interactions
CREATE POLICY "Users can view interactions involving them" ON public.social_interactions
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can create their own interactions" ON public.social_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for group_events
CREATE POLICY "Users can view published events" ON public.group_events
    FOR SELECT USING (status = 'published' OR auth.uid() = organizer_id);

CREATE POLICY "Users can create events for groups they belong to" ON public.group_events
    FOR INSERT WITH CHECK (
        auth.uid() = organizer_id AND 
        EXISTS (SELECT 1 FROM social_group_members WHERE group_id = group_events.group_id AND user_id = auth.uid())
    );

CREATE POLICY "Event organizers can update their events" ON public.group_events
    FOR UPDATE USING (auth.uid() = organizer_id);

-- RLS Policies for event_attendees
CREATE POLICY "Users can view event attendees" ON public.event_attendees
    FOR SELECT USING (true); -- Event attendance is generally public within group

CREATE POLICY "Users can manage their own attendance" ON public.event_attendees
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for moderation_queue
CREATE POLICY "Users can view their own reports" ON public.moderation_queue
    FOR SELECT USING (auth.uid() = reported_by);

CREATE POLICY "Users can create reports" ON public.moderation_queue
    FOR INSERT WITH CHECK (auth.uid() = reported_by);

-- Moderators need special access - will be handled by service role for now
CREATE POLICY "Service role has full moderation access" ON public.moderation_queue
    FOR ALL TO service_role USING (true);

-- RLS Policies for trust_scores
CREATE POLICY "Users can view all trust scores" ON public.trust_scores
    FOR SELECT USING (true); -- Trust scores are public

CREATE POLICY "Service role manages trust scores" ON public.trust_scores
    FOR ALL TO service_role USING (true);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_friendships TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT SELECT, INSERT ON public.social_interactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendees TO authenticated;
GRANT SELECT, INSERT ON public.moderation_queue TO authenticated;
GRANT SELECT ON public.trust_scores TO authenticated;

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language plpgsql;

-- Apply updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS update_user_friendships_updated_at ON public.user_friendships;
CREATE TRIGGER update_user_friendships_updated_at
    BEFORE UPDATE ON public.user_friendships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_events_updated_at ON public.group_events;
CREATE TRIGGER update_group_events_updated_at
    BEFORE UPDATE ON public.group_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_attendees_updated_at ON public.event_attendees;
CREATE TRIGGER update_event_attendees_updated_at
    BEFORE UPDATE ON public.event_attendees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_moderation_queue_updated_at ON public.moderation_queue;
CREATE TRIGGER update_moderation_queue_updated_at
    BEFORE UPDATE ON public.moderation_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trust score calculation function (basic implementation)
CREATE OR REPLACE FUNCTION calculate_user_trust_score(target_user_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    base_score DECIMAL(5,2) := 50.0;
    community_bonus DECIMAL(5,2) := 0.0;
    reliability_bonus DECIMAL(5,2) := 0.0;
    helpfulness_bonus DECIMAL(5,2) := 0.0;
    final_score DECIMAL(5,2);
BEGIN
    -- Community participation (posts, comments, group memberships)
    SELECT LEAST(20.0, COUNT(*) * 0.5) INTO community_bonus
    FROM social_posts WHERE user_id = target_user_id;
    
    -- Reliability (event attendance, keeping commitments)
    SELECT LEAST(15.0, COUNT(*) * 2.0) INTO reliability_bonus
    FROM event_attendees WHERE user_id = target_user_id AND status = 'going';
    
    -- Helpfulness (positive votes, helpful content)
    SELECT LEAST(15.0, COALESCE(SUM(upvotes - downvotes), 0) * 0.1) INTO helpfulness_bonus
    FROM social_posts WHERE user_id = target_user_id;
    
    -- Calculate final score (capped at 100)
    final_score := LEAST(100.0, base_score + community_bonus + reliability_bonus + helpfulness_bonus);
    
    -- Upsert trust score
    INSERT INTO trust_scores (user_id, overall_score, community_score, reliability_score, helpfulness_score, last_calculated)
    VALUES (target_user_id, final_score, 50.0 + community_bonus, 50.0 + reliability_bonus, 50.0 + helpfulness_bonus, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        overall_score = final_score,
        community_score = 50.0 + community_bonus,
        reliability_score = 50.0 + reliability_bonus,
        helpfulness_score = 50.0 + helpfulness_bonus,
        last_calculated = NOW();
    
    RETURN final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update attendee count when someone joins/leaves an event
CREATE OR REPLACE FUNCTION update_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'going' THEN
        UPDATE group_events 
        SET current_attendees = current_attendees + 1 
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes
        IF OLD.status != 'going' AND NEW.status = 'going' THEN
            UPDATE group_events 
            SET current_attendees = current_attendees + 1 
            WHERE id = NEW.event_id;
        ELSIF OLD.status = 'going' AND NEW.status != 'going' THEN
            UPDATE group_events 
            SET current_attendees = GREATEST(0, current_attendees - 1) 
            WHERE id = NEW.event_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'going' THEN
        UPDATE group_events 
        SET current_attendees = GREATEST(0, current_attendees - 1) 
        WHERE id = OLD.event_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_event_attendee_count_trigger ON public.event_attendees;
CREATE TRIGGER update_event_attendee_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.event_attendees
    FOR EACH ROW EXECUTE FUNCTION update_event_attendee_count();

-- Add helpful comments
COMMENT ON TABLE public.user_friendships IS 'Manages friend requests and friendships between users';
COMMENT ON TABLE public.user_follows IS 'Tracks user follow/follower relationships (public)';
COMMENT ON TABLE public.social_interactions IS 'Logs all social interactions for analytics and feeds';
COMMENT ON TABLE public.group_events IS 'Group events, meetups, and RV rallies';
COMMENT ON TABLE public.event_attendees IS 'Tracks event attendance and RSVPs';
COMMENT ON TABLE public.moderation_queue IS 'Content moderation and community reporting';
COMMENT ON TABLE public.trust_scores IS 'User reputation and trust scoring system';

-- Insert some sample data for testing (optional - only in development)
DO $$
BEGIN
    -- Only insert sample data if we're in a development environment
    -- This can be determined by checking for specific environment indicators
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'development_flag') THEN
        -- Sample trust scores for existing users
        INSERT INTO trust_scores (user_id, overall_score) 
        SELECT id, 75.0 FROM auth.users LIMIT 5
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;