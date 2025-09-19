-- Social Features Migration
-- Complete social platform functionality

-- Social posts table
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls TEXT[],
  post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'video', 'trip_share', 'location')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  trip_id UUID, -- Reference to user_trips if sharing trip content
  tags TEXT[],
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User friendships
CREATE TABLE IF NOT EXISTS user_friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

-- User follows (for following without mutual friendship)
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, followed_id),
  CONSTRAINT no_self_follow CHECK (follower_id != followed_id)
);

-- Social groups
CREATE TABLE IF NOT EXISTS social_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT DEFAULT 'public' CHECK (group_type IN ('public', 'private', 'secret')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'rv_travel', 'camping', 'road_trips', 'maintenance', 'destinations')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INTEGER DEFAULT 1,
  avatar_url TEXT,
  cover_url TEXT,
  rules TEXT,
  location TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social group members
CREATE TABLE IF NOT EXISTS social_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES social_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned')),
  UNIQUE(group_id, user_id)
);

-- Community events
CREATE TABLE IF NOT EXISTS community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES social_groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'meetup' CHECK (event_type IN ('meetup', 'rally', 'campout', 'rally', 'workshop', 'social')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  address TEXT,
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  entry_fee DECIMAL(8,2) DEFAULT 0,
  registration_required BOOLEAN DEFAULT false,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  image_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event attendees
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES community_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going', 'waitlist')),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checked_in_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  UNIQUE(event_id, user_id)
);

-- Social interactions (likes, comments, shares)
CREATE TABLE IF NOT EXISTS social_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'event', 'group')),
  target_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'dislike', 'comment', 'share', 'report')),
  content TEXT, -- For comments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id, interaction_type)
);

-- Content moderation
CREATE TABLE IF NOT EXISTS content_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'group', 'event', 'profile')),
  content_id UUID NOT NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'resolved')),
  action_taken TEXT CHECK (action_taken IN ('none', 'warning', 'content_removed', 'user_suspended', 'user_banned')),
  moderator_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_posts
CREATE POLICY "Users can view public posts" ON social_posts
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view own posts" ON social_posts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view friends posts" ON social_posts
  FOR SELECT USING (
    visibility = 'friends' AND 
    EXISTS (
      SELECT 1 FROM user_friendships 
      WHERE (user_id = auth.uid() AND friend_id = social_posts.user_id AND status = 'accepted')
      OR (friend_id = auth.uid() AND user_id = social_posts.user_id AND status = 'accepted')
    )
  );

-- RLS Policies for user_friendships
CREATE POLICY "Users can manage own friendships" ON user_friendships
  FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for user_follows
CREATE POLICY "Users can manage own follows" ON user_follows
  FOR ALL USING (auth.uid() = follower_id);

CREATE POLICY "Users can view who follows them" ON user_follows
  FOR SELECT USING (auth.uid() = followed_id);

-- RLS Policies for social_groups
CREATE POLICY "Users can view public groups" ON social_groups
  FOR SELECT USING (group_type = 'public');

CREATE POLICY "Group members can view private groups" ON social_groups
  FOR SELECT USING (
    group_type = 'private' AND 
    EXISTS (
      SELECT 1 FROM social_group_members 
      WHERE group_id = social_groups.id AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Group owners can manage groups" ON social_groups
  FOR ALL USING (auth.uid() = owner_id);

-- RLS Policies for social_group_members
CREATE POLICY "Group members can view membership" ON social_group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM social_group_members sgm 
      WHERE sgm.group_id = social_group_members.group_id AND sgm.user_id = auth.uid() AND sgm.status = 'active'
    )
  );

CREATE POLICY "Users can manage own membership" ON social_group_members
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for community_events
CREATE POLICY "Users can view public events" ON community_events
  FOR SELECT USING (is_public = true);

CREATE POLICY "Event organizers can manage events" ON community_events
  FOR ALL USING (auth.uid() = organizer_id);

-- RLS Policies for event_attendees
CREATE POLICY "Users can manage own attendance" ON event_attendees
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for social_interactions
CREATE POLICY "Users can manage own interactions" ON social_interactions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for content_moderation
CREATE POLICY "Users can report content" ON content_moderation
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view own reports" ON content_moderation
  FOR SELECT USING (auth.uid() = reported_by);

-- Apply updated_at triggers
CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_friendships_updated_at
  BEFORE UPDATE ON user_friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_groups_updated_at
  BEFORE UPDATE ON social_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_events_updated_at
  BEFORE UPDATE ON community_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_visibility ON social_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_social_posts_user_created ON social_posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_friendships_user_id ON user_friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_friendships_friend_id ON user_friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_user_friendships_status ON user_friendships(status);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followed_id ON user_follows(followed_id);

CREATE INDEX IF NOT EXISTS idx_social_groups_type ON social_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_social_groups_category ON social_groups(category);
CREATE INDEX IF NOT EXISTS idx_social_groups_owner_id ON social_groups(owner_id);

CREATE INDEX IF NOT EXISTS idx_social_group_members_group_id ON social_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_social_group_members_user_id ON social_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_social_group_members_status ON social_group_members(status);

CREATE INDEX IF NOT EXISTS idx_community_events_organizer_id ON community_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_community_events_start_date ON community_events(start_date);
CREATE INDEX IF NOT EXISTS idx_community_events_public ON community_events(is_public);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON event_attendees(status);

CREATE INDEX IF NOT EXISTS idx_social_interactions_user_id ON social_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_target ON social_interactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_type ON social_interactions(interaction_type);

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_social_posts_location ON social_posts USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_community_events_location ON community_events USING GIST(location);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_social_posts_content_search ON social_posts USING GIN(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_social_groups_search ON social_groups USING GIN(to_tsvector('english', name || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_community_events_search ON community_events USING GIN(to_tsvector('english', title || ' ' || description));