-- Create saved_trips table for storing user trip plans
CREATE TABLE IF NOT EXISTS public.saved_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_location VARCHAR(255) NOT NULL,
  end_location VARCHAR(255) NOT NULL,
  waypoints JSONB DEFAULT '[]'::jsonb,
  distance DECIMAL(10, 2),
  duration INTEGER, -- in minutes
  difficulty VARCHAR(50) DEFAULT 'moderate',
  is_public BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  route_data JSONB, -- Store full route geometry from Mapbox
  gpx_data TEXT, -- Store GPX export data
  estimated_days INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_saved_trips_user_id ON public.saved_trips(user_id);
CREATE INDEX idx_saved_trips_is_public ON public.saved_trips(is_public);
CREATE INDEX idx_saved_trips_created_at ON public.saved_trips(created_at DESC);
CREATE INDEX idx_saved_trips_tags ON public.saved_trips USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE public.saved_trips ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own trips
CREATE POLICY "Users can view own trips" ON public.saved_trips
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view public trips
CREATE POLICY "Anyone can view public trips" ON public.saved_trips
  FOR SELECT USING (is_public = true);

-- Users can insert their own trips
CREATE POLICY "Users can create own trips" ON public.saved_trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own trips
CREATE POLICY "Users can update own trips" ON public.saved_trips
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own trips
CREATE POLICY "Users can delete own trips" ON public.saved_trips
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_saved_trips_updated_at 
  BEFORE UPDATE ON public.saved_trips 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create trip_shares table for sharing trips with specific users
CREATE TABLE IF NOT EXISTS public.trip_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.saved_trips(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission VARCHAR(20) DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, shared_with)
);

-- Create indexes for trip_shares
CREATE INDEX idx_trip_shares_trip_id ON public.trip_shares(trip_id);
CREATE INDEX idx_trip_shares_shared_with ON public.trip_shares(shared_with);

-- Enable RLS for trip_shares
ALTER TABLE public.trip_shares ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trip_shares
CREATE POLICY "Users can view trips shared with them" ON public.saved_trips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trip_shares 
      WHERE trip_shares.trip_id = saved_trips.id 
      AND trip_shares.shared_with = auth.uid()
    )
  );

CREATE POLICY "Trip owners can share their trips" ON public.trip_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saved_trips 
      WHERE saved_trips.id = trip_shares.trip_id 
      AND saved_trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view shares they're involved in" ON public.trip_shares
  FOR SELECT USING (
    shared_by = auth.uid() OR shared_with = auth.uid()
  );

-- Add comments for documentation
COMMENT ON TABLE public.saved_trips IS 'Stores user-created trip plans with routes and metadata';
COMMENT ON COLUMN public.saved_trips.route_data IS 'Stores the complete route geometry from Mapbox API';
COMMENT ON COLUMN public.saved_trips.gpx_data IS 'Stores GPX export data for use with GPS devices';
COMMENT ON COLUMN public.saved_trips.tags IS 'Array of tags for categorizing and searching trips';
COMMENT ON TABLE public.trip_shares IS 'Manages sharing of trips between users with specific permissions';