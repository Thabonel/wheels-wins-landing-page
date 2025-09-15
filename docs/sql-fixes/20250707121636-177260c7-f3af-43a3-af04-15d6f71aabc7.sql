-- Enhanced Community Features: Social Networking, Group Planning, and Content Moderation

-- 1. Enhanced Social Networking Tables
CREATE TABLE IF NOT EXISTS public.user_profiles_extended (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bio TEXT,
  interests TEXT[],
  travel_style TEXT,
  rig_type TEXT,
  experience_level TEXT,
  social_preferences JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{"show_location": true, "allow_friend_requests": true, "show_travel_plans": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.social_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT CHECK (interaction_type IN ('like', 'comment', 'share', 'mention', 'follow', 'friend_request')),
  content_id UUID, -- Could reference posts, comments, etc.
  content_type TEXT, -- 'post', 'comment', 'group', etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enhanced Group Planning and Coordination
CREATE TABLE IF NOT EXISTS public.group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.social_groups(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.group_trips(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT CHECK (event_type IN ('meetup', 'trip', 'workshop', 'social', 'maintenance', 'other')) DEFAULT 'meetup',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  location JSONB, -- {name, address, coordinates}
  max_attendees INTEGER,
  requirements TEXT[],
  cost_per_person NUMERIC(10,2),
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('draft', 'published', 'cancelled', 'completed')) DEFAULT 'draft',
  visibility TEXT CHECK (visibility IN ('public', 'group_only', 'invite_only')) DEFAULT 'group_only',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('interested', 'going', 'not_going', 'maybe')) DEFAULT 'interested',
  rsvp_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.group_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.social_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT CHECK (resource_type IN ('document', 'link', 'file', 'guide', 'map', 'contact')) NOT NULL,
  url TEXT,
  file_path TEXT,
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.social_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL, -- Array of poll options
  poll_type TEXT CHECK (poll_type IN ('single_choice', 'multiple_choice', 'yes_no')) DEFAULT 'single_choice',
  is_anonymous BOOLEAN DEFAULT FALSE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.group_polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_options JSONB NOT NULL, -- Array of selected option indices
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- 3. Enhanced Content Moderation
CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT CHECK (content_type IN ('post', 'comment', 'group', 'event', 'user_profile', 'marketplace_listing')) NOT NULL,
  content_id UUID NOT NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  category TEXT CHECK (category IN ('spam', 'inappropriate', 'harassment', 'misinformation', 'copyright', 'other')) NOT NULL,
  description TEXT,
  evidence_urls TEXT[],
  priority_level TEXT CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed', 'escalated')) DEFAULT 'pending',
  assigned_moderator UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auto_moderation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  content_types TEXT[] NOT NULL,
  conditions JSONB NOT NULL, -- Conditions for triggering the rule
  actions JSONB NOT NULL, -- Actions to take when rule is triggered
  is_active BOOLEAN DEFAULT TRUE,
  severity_level TEXT CHECK (severity_level IN ('info', 'warning', 'moderate', 'severe')) DEFAULT 'warning',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT CHECK (action_type IN ('warning', 'mute', 'temporary_ban', 'permanent_ban', 'content_removal', 'account_restriction')) NOT NULL,
  reason TEXT NOT NULL,
  duration_hours INTEGER, -- For temporary actions
  content_type TEXT,
  content_id UUID,
  is_automated BOOLEAN DEFAULT FALSE,
  appeal_status TEXT CHECK (appeal_status IN ('none', 'pending', 'approved', 'denied')) DEFAULT 'none',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trust_scores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score NUMERIC(5,2) DEFAULT 100.00 CHECK (score >= 0 AND score <= 100),
  factors JSONB DEFAULT '{}', -- Breakdown of trust factors
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_profiles_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_moderation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User Profiles Extended
CREATE POLICY "Users can view their own extended profile"
  ON public.user_profiles_extended FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public profile data"
  ON public.user_profiles_extended FOR SELECT
  USING (true);

-- User Friendships
CREATE POLICY "Users can manage their own friendships"
  ON public.user_friendships FOR ALL
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- User Follows
CREATE POLICY "Users can manage their own follows"
  ON public.user_follows FOR ALL
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Social Interactions
CREATE POLICY "Users can view interactions involving them"
  ON public.social_interactions FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can create interactions"
  ON public.social_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Group Events
CREATE POLICY "Group members can view group events"
  ON public.group_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships gm
      WHERE gm.group_id = group_events.group_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    ) OR visibility = 'public'
  );

CREATE POLICY "Group admins can manage events"
  ON public.group_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.social_groups sg
      WHERE sg.id = group_events.group_id
      AND (sg.owner_id = auth.uid() OR sg.admin_id = auth.uid())
    ) OR auth.uid() = organizer_id
  );

-- Event Attendees
CREATE POLICY "Users can manage their event attendance"
  ON public.event_attendees FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Event organizers can view attendees"
  ON public.event_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_events ge
      WHERE ge.id = event_attendees.event_id
      AND ge.organizer_id = auth.uid()
    )
  );

-- Group Resources
CREATE POLICY "Group members can access resources"
  ON public.group_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships gm
      WHERE gm.group_id = group_resources.group_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
  );

CREATE POLICY "Group admins can manage resources"
  ON public.group_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.social_groups sg
      WHERE sg.id = group_resources.group_id
      AND (sg.owner_id = auth.uid() OR sg.admin_id = auth.uid())
    ) OR auth.uid() = created_by
  );

-- Group Polls
CREATE POLICY "Group members can view polls"
  ON public.group_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships gm
      WHERE gm.group_id = group_polls.group_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
  );

CREATE POLICY "Group admins can manage polls"
  ON public.group_polls FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.social_groups sg
      WHERE sg.id = group_polls.group_id
      AND (sg.owner_id = auth.uid() OR sg.admin_id = auth.uid())
    ) OR auth.uid() = created_by
  );

-- Poll Votes
CREATE POLICY "Users can manage their poll votes"
  ON public.poll_votes FOR ALL
  USING (auth.uid() = user_id);

-- Moderation Queue
CREATE POLICY "Users can create reports"
  ON public.moderation_queue FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own reports"
  ON public.moderation_queue FOR SELECT
  USING (auth.uid() = reported_by);

CREATE POLICY "Moderators can manage moderation queue"
  ON public.moderation_queue FOR ALL
  USING (is_admin_user(auth.uid()));

-- Auto Moderation Rules
CREATE POLICY "Admins can manage auto moderation rules"
  ON public.auto_moderation_rules FOR ALL
  USING (is_admin_user(auth.uid()));

-- Moderation Actions
CREATE POLICY "Moderators can manage moderation actions"
  ON public.moderation_actions FOR ALL
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Users can view actions against them"
  ON public.moderation_actions FOR SELECT
  USING (auth.uid() = target_user_id);

-- Trust Scores
CREATE POLICY "Users can view their own trust score"
  ON public.trust_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage trust scores"
  ON public.trust_scores FOR ALL
  USING (is_admin_user(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_friendships_status ON public.user_friendships(status);
CREATE INDEX IF NOT EXISTS idx_user_friendships_users ON public.user_friendships(requester_id, addressee_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_user ON public.social_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_target ON public.social_interactions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_type ON public.social_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_group_events_group ON public.group_events(group_id);
CREATE INDEX IF NOT EXISTS idx_group_events_date ON public.group_events(start_date);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON public.event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_group_resources_group ON public.group_resources(group_id);
CREATE INDEX IF NOT EXISTS idx_group_polls_group ON public.group_polls(group_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON public.moderation_queue(priority_level);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_user ON public.moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_type ON public.moderation_actions(action_type);

-- Functions for enhanced features

-- Function to calculate trust score
CREATE OR REPLACE FUNCTION public.calculate_trust_score(user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_score NUMERIC := 100.00;
  post_count INTEGER;
  positive_interactions INTEGER;
  negative_interactions INTEGER;
  moderation_actions INTEGER;
  account_age_days INTEGER;
  final_score NUMERIC;
BEGIN
  -- Get user statistics
  SELECT 
    (SELECT COUNT(*) FROM social_posts WHERE social_posts.user_id = calculate_trust_score.user_id),
    (SELECT COUNT(*) FROM social_interactions WHERE target_user_id = calculate_trust_score.user_id AND interaction_type IN ('like', 'follow')),
    (SELECT COUNT(*) FROM moderation_queue WHERE content_id IN (SELECT id FROM social_posts WHERE social_posts.user_id = calculate_trust_score.user_id)),
    (SELECT COUNT(*) FROM moderation_actions WHERE target_user_id = calculate_trust_score.user_id),
    (SELECT EXTRACT(DAYS FROM NOW() - created_at) FROM auth.users WHERE id = calculate_trust_score.user_id)
  INTO post_count, positive_interactions, negative_interactions, moderation_actions, account_age_days;
  
  -- Calculate score based on factors
  final_score := base_score;
  
  -- Positive factors
  final_score := final_score + LEAST(post_count * 0.5, 10); -- Max 10 points for posts
  final_score := final_score + LEAST(positive_interactions * 0.1, 5); -- Max 5 points for positive interactions
  final_score := final_score + LEAST(account_age_days * 0.01, 5); -- Max 5 points for account age
  
  -- Negative factors
  final_score := final_score - (negative_interactions * 2); -- -2 points per report
  final_score := final_score - (moderation_actions * 5); -- -5 points per moderation action
  
  -- Ensure score is within bounds
  final_score := GREATEST(0, LEAST(100, final_score));
  
  -- Update or insert trust score
  INSERT INTO trust_scores (user_id, score, last_calculated, updated_at)
  VALUES (calculate_trust_score.user_id, final_score, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    score = final_score,
    last_calculated = NOW(),
    updated_at = NOW();
    
  RETURN final_score;
END;
$$;

-- Function to auto-moderate content
CREATE OR REPLACE FUNCTION public.auto_moderate_content(
  content_type TEXT,
  content_id UUID,
  content_text TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule RECORD;
  should_flag BOOLEAN := FALSE;
BEGIN
  -- Check against auto-moderation rules
  FOR rule IN 
    SELECT * FROM auto_moderation_rules 
    WHERE is_active = TRUE 
    AND content_type = ANY(content_types)
  LOOP
    -- Simple keyword matching (can be enhanced with more sophisticated AI/ML)
    IF content_text ~* (rule.conditions->>'keywords')::TEXT THEN
      should_flag := TRUE;
      
      -- Create moderation queue entry
      INSERT INTO moderation_queue (
        content_type,
        content_id,
        reason,
        category,
        priority_level,
        status
      ) VALUES (
        auto_moderate_content.content_type,
        auto_moderate_content.content_id,
        'Automatically flagged by rule: ' || rule.rule_name,
        'inappropriate',
        rule.severity_level,
        'pending'
      );
      
      EXIT; -- Exit after first match
    END IF;
  END LOOP;
  
  RETURN should_flag;
END;
$$;