-- Combined baseline migration for staging Supabase
-- Generated: Tue Jun 16 09:29:57 AEST 2026


-- ============================================================
-- MIGRATION: 01_foundation.sql
-- ============================================================

-- Foundation Migration: User Profiles and Core Tables
-- This establishes the foundation for all other features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profiles table (foundation for all user-related features)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  date_of_birth DATE,
  location TEXT,
  website TEXT,
  privacy_settings JSONB DEFAULT '{"profile_visibility": "public", "contact_visibility": "friends"}',
  preferences JSONB DEFAULT '{"notifications": true, "marketing_emails": false}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings table for application preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  setting_name TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, setting_name)
);

-- User sessions for authentication tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB,
  ip_address INET,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Two-factor authentication table
CREATE TABLE IF NOT EXISTS user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  secret_key TEXT NOT NULL,
  backup_codes TEXT[],
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_settings
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_2fa
CREATE POLICY "Users can manage own 2FA" ON user_2fa
  FOR ALL USING (auth.uid() = user_id);

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_name ON user_settings(setting_name);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON user_2fa(user_id);

-- ============================================================
-- MIGRATION: 02_trip_planning.sql
-- ============================================================

-- Trip Planning System Migration
-- Comprehensive trip planning with PostGIS spatial support

-- User trips table (main trip container)
CREATE TABLE IF NOT EXISTS user_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  trip_type TEXT DEFAULT 'road_trip' CHECK (trip_type IN ('road_trip', 'camping', 'rv_travel', 'business', 'vacation')),
  total_budget DECIMAL(10,2),
  spent_budget DECIMAL(10,2) DEFAULT 0,
  privacy_level TEXT DEFAULT 'private' CHECK (privacy_level IN ('private', 'friends', 'public')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip routes (GPS routes within trips)
CREATE TABLE IF NOT EXISTS trip_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES user_trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,
  start_location GEOGRAPHY(POINT, 4326),
  end_location GEOGRAPHY(POINT, 4326),
  route_data JSONB, -- Store full route geometry and metadata
  distance_km DECIMAL(8,2),
  estimated_duration_hours DECIMAL(5,2),
  route_order INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip waypoints (stops along routes)
CREATE TABLE IF NOT EXISTS trip_waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES trip_routes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  waypoint_type TEXT DEFAULT 'stop' CHECK (waypoint_type IN ('stop', 'gas_station', 'restaurant', 'lodging', 'attraction', 'rest_area')),
  planned_arrival TIMESTAMP WITH TIME ZONE,
  planned_departure TIMESTAMP WITH TIME ZONE,
  actual_arrival TIMESTAMP WITH TIME ZONE,
  actual_departure TIMESTAMP WITH TIME ZONE,
  waypoint_order INTEGER NOT NULL,
  visit_duration_minutes INTEGER,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip templates (reusable trip plans)
CREATE TABLE IF NOT EXISTS trip_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL, -- Store complete trip structure
  category TEXT DEFAULT 'general',
  is_public BOOLEAN DEFAULT false,
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip expenses tracking
CREATE TABLE IF NOT EXISTS trip_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES user_trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('fuel', 'food', 'lodging', 'attractions', 'maintenance', 'other')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  vendor TEXT,
  location GEOGRAPHY(POINT, 4326),
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  payment_method TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_trips
CREATE POLICY "Users can manage own trips" ON user_trips
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public trips" ON user_trips
  FOR SELECT USING (privacy_level = 'public');

-- RLS Policies for trip_routes
CREATE POLICY "Users can manage own trip routes" ON trip_routes
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for trip_waypoints
CREATE POLICY "Users can manage own waypoints" ON trip_waypoints
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for trip_templates
CREATE POLICY "Users can manage own templates" ON trip_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public templates" ON trip_templates
  FOR SELECT USING (is_public = true);

-- RLS Policies for trip_expenses
CREATE POLICY "Users can manage own trip expenses" ON trip_expenses
  FOR ALL USING (auth.uid() = user_id);

-- Apply updated_at triggers
CREATE TRIGGER update_user_trips_updated_at
  BEFORE UPDATE ON user_trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_routes_updated_at
  BEFORE UPDATE ON trip_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_waypoints_updated_at
  BEFORE UPDATE ON trip_waypoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_templates_updated_at
  BEFORE UPDATE ON trip_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_expenses_updated_at
  BEFORE UPDATE ON trip_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);
CREATE INDEX IF NOT EXISTS idx_user_trips_dates ON user_trips(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_user_trips_user_status ON user_trips(user_id, status);

CREATE INDEX IF NOT EXISTS idx_trip_routes_trip_id ON trip_routes(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_routes_user_id ON trip_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_routes_order ON trip_routes(trip_id, route_order);

CREATE INDEX IF NOT EXISTS idx_trip_waypoints_route_id ON trip_waypoints(route_id);
CREATE INDEX IF NOT EXISTS idx_trip_waypoints_user_id ON trip_waypoints(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_waypoints_order ON trip_waypoints(route_id, waypoint_order);

CREATE INDEX IF NOT EXISTS idx_trip_templates_user_id ON trip_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_templates_public ON trip_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_trip_templates_category ON trip_templates(category);

CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_id ON trip_expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_user_id ON trip_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_date ON trip_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_category ON trip_expenses(category);

-- Spatial indexes for location data
CREATE INDEX IF NOT EXISTS idx_trip_routes_start_location ON trip_routes USING GIST(start_location);
CREATE INDEX IF NOT EXISTS idx_trip_routes_end_location ON trip_routes USING GIST(end_location);
CREATE INDEX IF NOT EXISTS idx_trip_waypoints_location ON trip_waypoints USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_location ON trip_expenses USING GIST(location);

-- ============================================================
-- MIGRATION: 03_social_features.sql
-- ============================================================

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

-- ============================================================
-- MIGRATION: 04_marketplace.sql
-- ============================================================

-- Marketplace and Commerce Migration
-- Complete marketplace functionality with affiliate system

-- Marketplace listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('rv_parts', 'camping_gear', 'tools', 'electronics', 'accessories', 'vehicles', 'books', 'clothing', 'other')),
  subcategory TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  condition TEXT NOT NULL CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'pending', 'inactive', 'deleted')),
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  shipping_available BOOLEAN DEFAULT false,
  shipping_cost DECIMAL(8,2),
  pickup_available BOOLEAN DEFAULT true,
  image_urls TEXT[],
  tags TEXT[],
  brand TEXT,
  model TEXT,
  year INTEGER,
  dimensions TEXT,
  weight_lbs DECIMAL(8,2),
  view_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User wishlists
CREATE TABLE IF NOT EXISTS user_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  notes TEXT,
  price_alert_threshold DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- Affiliate sales tracking
CREATE TABLE IF NOT EXISTS affiliate_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,
  affiliate_code TEXT NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL, -- Percentage as decimal (e.g., 0.05 for 5%)
  sale_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'disputed', 'cancelled')),
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmation_date TIMESTAMP WITH TIME ZONE,
  payment_date TIMESTAMP WITH TIME ZONE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform TEXT DEFAULT 'internal', -- 'internal', 'amazon', 'ebay', etc.
  external_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product reviews (for marketplace items)
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  verified_purchase BOOLEAN DEFAULT false,
  helpful_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(listing_id, reviewer_id)
);

-- Marketplace messages (buyer-seller communication)
CREATE TABLE IF NOT EXISTS marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'inquiry' CHECK (message_type IN ('inquiry', 'offer', 'counteroffer', 'acceptance', 'general')),
  offer_amount DECIMAL(10,2),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  search_name TEXT NOT NULL,
  search_criteria JSONB NOT NULL, -- Store search filters and keywords
  notification_enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_listings
CREATE POLICY "Anyone can view active listings" ON marketplace_listings
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can manage own listings" ON marketplace_listings
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_wishlists
CREATE POLICY "Users can manage own wishlists" ON user_wishlists
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for affiliate_sales
CREATE POLICY "Users can view own affiliate sales" ON affiliate_sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own affiliate sales" ON affiliate_sales
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for product_reviews
CREATE POLICY "Anyone can view reviews" ON product_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own reviews" ON product_reviews
  FOR ALL USING (auth.uid() = reviewer_id);

-- RLS Policies for marketplace_messages
CREATE POLICY "Users can view own messages" ON marketplace_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON marketplace_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for saved_searches
CREATE POLICY "Users can manage own saved searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id);

-- Apply updated_at triggers
CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_sales_updated_at
  BEFORE UPDATE ON affiliate_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_user_id ON marketplace_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_price ON marketplace_listings(price);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created_at ON marketplace_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category_status ON marketplace_listings(category, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_featured ON marketplace_listings(is_featured, status);

CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_listing_id ON user_wishlists(listing_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_id ON affiliate_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status ON affiliate_sales(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_sale_date ON affiliate_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_date ON affiliate_sales(user_id, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_product_reviews_listing_id ON product_reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_reviewer_id ON product_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_seller_id ON product_reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);

CREATE INDEX IF NOT EXISTS idx_marketplace_messages_listing_id ON marketplace_messages(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_messages_sender_id ON marketplace_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_messages_recipient_id ON marketplace_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_messages_created_at ON marketplace_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_notification ON saved_searches(notification_enabled);

-- Spatial indexes for location-based searches
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_location ON marketplace_listings USING GIST(location);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_search ON marketplace_listings USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(brand, '') || ' ' || COALESCE(model, '')));

-- Partial indexes for active listings
CREATE INDEX IF NOT EXISTS idx_marketplace_active_listings ON marketplace_listings(category, price, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_marketplace_featured_listings ON marketplace_listings(created_at DESC) WHERE is_featured = true AND status = 'active';

-- ============================================================
-- MIGRATION: 05_vehicle_management.sql
-- ============================================================

-- Vehicle Management Migration
-- Vehicle tracking, maintenance, and fuel logging

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vin TEXT UNIQUE,
  license_plate TEXT,
  vehicle_type TEXT DEFAULT 'rv' CHECK (vehicle_type IN ('rv', 'motorhome', 'travel_trailer', 'fifth_wheel', 'truck', 'car', 'motorcycle', 'boat')),
  fuel_type TEXT DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid', 'propane')),
  fuel_capacity_gallons DECIMAL(6,2),
  engine_size TEXT,
  transmission TEXT,
  mileage_current INTEGER,
  mileage_purchased INTEGER,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  insurance_company TEXT,
  insurance_policy TEXT,
  insurance_expires DATE,
  registration_expires DATE,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  image_urls TEXT[],
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance records
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('oil_change', 'tire_rotation', 'brake_service', 'transmission_service', 'coolant_flush', 'air_filter', 'fuel_filter', 'spark_plugs', 'battery', 'inspection', 'repair', 'upgrade', 'other')),
  description TEXT NOT NULL,
  service_provider TEXT,
  location TEXT,
  cost DECIMAL(8,2),
  currency TEXT DEFAULT 'USD',
  mileage_at_service INTEGER,
  date DATE NOT NULL,
  next_service_mileage INTEGER,
  next_service_date DATE,
  parts_replaced TEXT[],
  labor_hours DECIMAL(4,2),
  warranty_info TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fuel log
CREATE TABLE IF NOT EXISTS fuel_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  trip_id UUID, -- Reference to user_trips if part of a trip
  gallons DECIMAL(6,3) NOT NULL,
  cost_per_gallon DECIMAL(6,3),
  total_cost DECIMAL(8,2),
  currency TEXT DEFAULT 'USD',
  fuel_type TEXT DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'propane')),
  octane_rating INTEGER,
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  station_name TEXT,
  mileage INTEGER,
  miles_since_last_fillup INTEGER,
  mpg_calculated DECIMAL(5,2),
  is_full_tank BOOLEAN DEFAULT true,
  payment_method TEXT,
  receipt_url TEXT,
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle expenses (non-fuel, non-maintenance)
CREATE TABLE IF NOT EXISTS vehicle_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('insurance', 'registration', 'parking', 'tolls', 'storage', 'financing', 'other')),
  description TEXT NOT NULL,
  amount DECIMAL(8,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  vendor TEXT,
  expense_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('monthly', 'quarterly', 'annually')),
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service reminders
CREATE TABLE IF NOT EXISTS service_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  description TEXT NOT NULL,
  due_mileage INTEGER,
  due_date DATE,
  is_completed BOOLEAN DEFAULT false,
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicles
CREATE POLICY "Users can manage own vehicles" ON vehicles
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for maintenance_records
CREATE POLICY "Users can manage own maintenance records" ON maintenance_records
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for fuel_log
CREATE POLICY "Users can manage own fuel log" ON fuel_log
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for vehicle_expenses
-- NOTE: vehicle_expenses policy in chunk_02
