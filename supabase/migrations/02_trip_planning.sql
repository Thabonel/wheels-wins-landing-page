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