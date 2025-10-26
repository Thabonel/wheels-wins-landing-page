-- Community Hub Database Schema
-- Supports tag-based community connections, messaging, and discovery

-- User tags table
CREATE TABLE IF NOT EXISTS user_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_category TEXT NOT NULL CHECK (tag_category IN ('vehicle_type', 'departure_timeframe', 'previous_career', 'destination_preference', 'lifestyle', 'skill')),
  tag_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Connections table (friend requests, follows, etc.)
CREATE TABLE IF NOT EXISTS community_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('friend', 'mentor', 'mentee', 'buddy')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, connected_user_id, connection_type)
);

-- Messages table
CREATE TABLE IF NOT EXISTS community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Success stories table
CREATE TABLE IF NOT EXISTS community_success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  story TEXT NOT NULL,
  transition_duration_months INTEGER,
  departure_date DATE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Group discussions table
CREATE TABLE IF NOT EXISTS community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Group members table
CREATE TABLE IF NOT EXISTS community_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Group posts table
CREATE TABLE IF NOT EXISTS community_group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  replies_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_tags_user ON user_tags(user_id);
CREATE INDEX idx_user_tags_category ON user_tags(tag_category, tag_value);
CREATE INDEX idx_connections_user ON community_connections(user_id);
CREATE INDEX idx_connections_connected ON community_connections(connected_user_id);
CREATE INDEX idx_connections_status ON community_connections(status);
CREATE INDEX idx_messages_sender ON community_messages(sender_id);
CREATE INDEX idx_messages_recipient ON community_messages(recipient_id, is_read);
CREATE INDEX idx_success_stories_user ON community_success_stories(user_id);
CREATE INDEX idx_success_stories_public ON community_success_stories(is_public, created_at DESC);
CREATE INDEX idx_group_members_group ON community_group_members(group_id);
CREATE INDEX idx_group_members_user ON community_group_members(user_id);
CREATE INDEX idx_group_posts_group ON community_group_posts(group_id, created_at DESC);

-- Function to find users with similar tags
CREATE OR REPLACE FUNCTION find_similar_users(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  matching_tags INTEGER,
  tags JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH user_tags_list AS (
    SELECT tag_value
    FROM user_tags
    WHERE user_id = p_user_id
  ),
  similar_users AS (
    SELECT
      ut.user_id,
      COUNT(DISTINCT ut.tag_value) as matching_tags
    FROM user_tags ut
    WHERE ut.tag_value IN (SELECT tag_value FROM user_tags_list)
      AND ut.user_id != p_user_id
    GROUP BY ut.user_id
    HAVING COUNT(DISTINCT ut.tag_value) > 0
    ORDER BY matching_tags DESC
    LIMIT p_limit
  )
  SELECT
    su.user_id,
    p.email,
    p.full_name,
    su.matching_tags::INTEGER,
    jsonb_agg(
      jsonb_build_object(
        'category', ut.tag_category,
        'value', ut.tag_value
      )
    ) as tags
  FROM similar_users su
  JOIN profiles p ON p.id = su.user_id
  LEFT JOIN user_tags ut ON ut.user_id = su.user_id
  GROUP BY su.user_id, p.email, p.full_name, su.matching_tags
  ORDER BY su.matching_tags DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get user connection stats
CREATE OR REPLACE FUNCTION get_user_connection_stats(p_user_id UUID)
RETURNS TABLE (
  total_connections INTEGER,
  pending_requests INTEGER,
  mentors INTEGER,
  mentees INTEGER,
  buddies INTEGER,
  unread_messages INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM community_connections
     WHERE (user_id = p_user_id OR connected_user_id = p_user_id) AND status = 'accepted'),
    (SELECT COUNT(*)::INTEGER FROM community_connections
     WHERE connected_user_id = p_user_id AND status = 'pending'),
    (SELECT COUNT(*)::INTEGER FROM community_connections
     WHERE user_id = p_user_id AND connection_type = 'mentor' AND status = 'accepted'),
    (SELECT COUNT(*)::INTEGER FROM community_connections
     WHERE connected_user_id = p_user_id AND connection_type = 'mentor' AND status = 'accepted'),
    (SELECT COUNT(*)::INTEGER FROM community_connections
     WHERE (user_id = p_user_id OR connected_user_id = p_user_id)
       AND connection_type = 'buddy' AND status = 'accepted'),
    (SELECT COUNT(*)::INTEGER FROM community_messages
     WHERE recipient_id = p_user_id AND is_read = FALSE);
END;
$$ LANGUAGE plpgsql STABLE;
