-- Create friends system tables
CREATE TABLE public.user_friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, friend_id)
);

-- Create friend locations for real-time tracking
CREATE TABLE public.friend_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_name TEXT,
    status TEXT NOT NULL DEFAULT 'traveling' CHECK (status IN ('traveling', 'camped', 'offline')),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group trips table
CREATE TABLE public.group_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    meeting_point JSONB, -- {name, latitude, longitude}
    route_data JSONB, -- Shared route information
    budget_coordination JSONB, -- Group budget settings
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group trip participants
CREATE TABLE public.group_trip_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.group_trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('organizer', 'participant')),
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(trip_id, user_id)
);

-- Create meetup suggestions table
CREATE TABLE public.meetup_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    suggested_location JSONB NOT NULL, -- {name, latitude, longitude}
    suggested_date DATE,
    trip_day INTEGER,
    distance_deviation_km DECIMAL(10, 2),
    cost_impact DECIMAL(10, 2),
    confidence_score DECIMAL(3, 2) DEFAULT 0.8,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days')
);

-- Create user profiles for social features (if not exists)
CREATE TABLE IF NOT EXISTS public.user_social_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    rv_info JSONB, -- {type, make, model, year, length}
    location_sharing_enabled BOOLEAN DEFAULT true,
    friends_can_see_route BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetup_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_social_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_friends
CREATE POLICY "Users can view their own friendships" ON public.user_friends
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests" ON public.user_friends
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friend status" ON public.user_friends
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for friend_locations
CREATE POLICY "Users can view friend locations" ON public.friend_locations
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.user_friends 
            WHERE (user_id = auth.uid() AND friend_id = friend_locations.user_id AND status = 'accepted')
            OR (friend_id = auth.uid() AND user_id = friend_locations.user_id AND status = 'accepted')
        )
    );

CREATE POLICY "Users can update their own location" ON public.friend_locations
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for group_trips
CREATE POLICY "Users can view trips they're part of" ON public.group_trips
    FOR SELECT USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.group_trip_participants 
            WHERE trip_id = group_trips.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create group trips" ON public.group_trips
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Trip creators can update trips" ON public.group_trips
    FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for group_trip_participants
CREATE POLICY "Users can view trip participants" ON public.group_trip_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_trips 
            WHERE id = trip_id AND (created_by = auth.uid() OR 
                EXISTS (SELECT 1 FROM public.group_trip_participants gtp WHERE gtp.trip_id = trip_id AND gtp.user_id = auth.uid()))
        )
    );

CREATE POLICY "Trip organizers can manage participants" ON public.group_trip_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.group_trips 
            WHERE id = trip_id AND created_by = auth.uid()
        )
    );

-- RLS Policies for meetup_suggestions
CREATE POLICY "Users can view their meetup suggestions" ON public.meetup_suggestions
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create meetup suggestions" ON public.meetup_suggestions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update meetup suggestions" ON public.meetup_suggestions
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for user_social_profiles
CREATE POLICY "Users can view social profiles" ON public.user_social_profiles
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.user_friends 
            WHERE (user_id = auth.uid() AND friend_id = user_social_profiles.user_id AND status = 'accepted')
            OR (friend_id = auth.uid() AND user_id = user_social_profiles.user_id AND status = 'accepted')
        )
    );

CREATE POLICY "Users can manage their own profile" ON public.user_social_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_friends_user_id ON public.user_friends(user_id);
CREATE INDEX idx_user_friends_friend_id ON public.user_friends(friend_id);
CREATE INDEX idx_user_friends_status ON public.user_friends(status);
CREATE INDEX idx_friend_locations_user_id ON public.friend_locations(user_id);
CREATE INDEX idx_friend_locations_updated ON public.friend_locations(last_updated);
CREATE INDEX idx_group_trip_participants_trip_id ON public.group_trip_participants(trip_id);
CREATE INDEX idx_meetup_suggestions_user_id ON public.meetup_suggestions(user_id);
CREATE INDEX idx_meetup_suggestions_expires ON public.meetup_suggestions(expires_at);

-- Create triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_group_trips_updated_at BEFORE UPDATE ON public.group_trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_social_profiles_updated_at BEFORE UPDATE ON public.user_social_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();