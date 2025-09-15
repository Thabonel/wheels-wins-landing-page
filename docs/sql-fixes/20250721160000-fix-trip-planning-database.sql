-- Fix Trip Planning Database Operations and Route Storage
-- Create proper tables for individual user trips vs. group trips

-- Enable PostGIS extension for geographic data types
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. USER TRIPS TABLE - Individual trip storage (separate from group trips)
CREATE TABLE IF NOT EXISTS public.user_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic trip information
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled', 'draft')),
    trip_type TEXT DEFAULT 'recreational' CHECK (trip_type IN ('recreational', 'business', 'relocation', 'seasonal', 'emergency')),
    
    -- Trip dates
    start_date DATE,
    end_date DATE,
    estimated_duration_days INTEGER,
    
    -- Location data (structured for better querying)
    origin_location JSONB, -- {name: "City, State", coordinates: [lng, lat], address: "full address", type: "city|campground|poi"}
    destination_location JSONB,
    
    -- Route and planning data
    route_data JSONB, -- Structured: {profile: "driving", waypoints: [], optimization: "time|distance", avoidTolls: bool}
    route_geometry GEOMETRY(LINESTRING, 4326), -- Actual route path for spatial queries
    route_summary JSONB, -- {distance_km: 123, duration_minutes: 456, fuel_cost: 78.90}
    
    -- Vehicle and preferences
    vehicle_type TEXT DEFAULT 'rv' CHECK (vehicle_type IN ('rv', 'motorhome', 'travel_trailer', 'fifth_wheel', 'van', 'truck', 'car')),
    vehicle_specs JSONB, -- {length_ft: 30, height_ft: 12, weight_lbs: 15000, fuel_type: "gas|diesel"}
    route_preferences JSONB, -- {avoid_tolls: true, prefer_highways: false, max_grade: 6, avoid_low_clearances: true}
    
    -- Budget and costs
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    fuel_budget DECIMAL(10,2),
    accommodation_budget DECIMAL(10,2),
    food_budget DECIMAL(10,2),
    
    -- Trip sharing and collaboration
    is_public BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false, -- Allow saving as reusable template
    shared_with_users UUID[] DEFAULT '{}', -- Array of user IDs with access
    
    -- Metadata
    tags TEXT[], -- ["family-friendly", "boondocking", "scenic", "national-parks"]
    notes TEXT,
    weather_considerations TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TRIP ROUTES TABLE - Normalized route storage for better performance
CREATE TABLE IF NOT EXISTS public.trip_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.user_trips(id) ON DELETE CASCADE,
    
    -- Route metadata
    route_name TEXT NOT NULL DEFAULT 'Main Route',
    route_type TEXT DEFAULT 'primary' CHECK (route_type IN ('primary', 'alternate', 'return', 'detour')),
    routing_profile TEXT DEFAULT 'driving' CHECK (routing_profile IN ('driving', 'driving-traffic', 'truck', 'motorcycle')),
    
    -- Geographic data
    route_geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
    bounding_box GEOMETRY(POLYGON, 4326), -- For spatial indexing
    
    -- Route metrics
    distance_km DECIMAL(10,3) NOT NULL,
    distance_miles DECIMAL(10,3), -- For US users
    duration_minutes INTEGER NOT NULL,
    elevation_gain_m INTEGER,
    elevation_loss_m INTEGER,
    max_elevation_m INTEGER,
    max_grade_percent DECIMAL(5,2),
    
    -- Route optimization data
    optimization_type TEXT DEFAULT 'time' CHECK (optimization_type IN ('time', 'distance', 'fuel')),
    optimization_score DECIMAL(8,2), -- Algorithm-specific score
    avoids_tolls BOOLEAN DEFAULT false,
    avoids_highways BOOLEAN DEFAULT false,
    avoids_ferries BOOLEAN DEFAULT false,
    
    -- Vehicle constraints considered
    max_height_clearance_m DECIMAL(5,2),
    max_weight_limit_kg INTEGER,
    hazmat_restrictions BOOLEAN DEFAULT false,
    
    -- External service data
    mapbox_route_id TEXT, -- Mapbox route identifier for caching
    google_route_polyline TEXT, -- Encoded polyline for compatibility
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TRIP WAYPOINTS TABLE - Structured waypoint management
CREATE TABLE IF NOT EXISTS public.trip_waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.user_trips(id) ON DELETE CASCADE,
    route_id UUID REFERENCES public.trip_routes(id) ON DELETE CASCADE,
    
    -- Waypoint identification
    name TEXT NOT NULL,
    waypoint_type TEXT DEFAULT 'stop' CHECK (waypoint_type IN (
        'origin', 'destination', 'stop', 'fuel', 'camping', 'attraction', 
        'rest', 'food', 'repair', 'dumping', 'water', 'emergency'
    )),
    
    -- Location data
    coordinates POINT NOT NULL, -- PostGIS point type
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'US',
    postal_code TEXT,
    
    -- Waypoint ordering and constraints
    waypoint_order INTEGER NOT NULL,
    is_locked BOOLEAN DEFAULT false, -- Cannot be moved during optimization
    is_required BOOLEAN DEFAULT true, -- Must be included in route
    
    -- Timing and logistics
    arrival_time TIME,
    departure_time TIME,
    duration_minutes INTEGER, -- How long to stay at this waypoint
    timezone TEXT, -- For time-aware planning
    
    -- Waypoint details
    description TEXT,
    notes TEXT,
    contact_info JSONB, -- {phone: "", website: "", email: ""}
    business_hours JSONB, -- {monday: "9-17", tuesday: "closed", ...}
    
    -- Services and amenities
    services JSONB, -- {fuel: true, dump: true, water: true, electric: true, wifi: true}
    cost_per_night DECIMAL(8,2),
    reservation_required BOOLEAN DEFAULT false,
    reservation_info JSONB, -- {website: "", phone: "", booking_id: ""}
    
    -- User experience
    rating DECIMAL(3,2), -- User's rating 1.0-5.0
    visited BOOLEAN DEFAULT false,
    visit_date DATE,
    photos TEXT[], -- Array of photo URLs
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure proper ordering
    UNIQUE(trip_id, waypoint_order)
);

-- 4. TRIP TEMPLATES TABLE - Reusable trip templates
CREATE TABLE IF NOT EXISTS public.trip_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Template metadata
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN (
        'general', 'national_parks', 'coastal', 'mountains', 'desert', 
        'historic', 'family', 'adventure', 'luxury', 'budget'
    )),
    
    -- Template data (copied from user_trips structure)
    template_data JSONB NOT NULL, -- Full trip structure without user-specific data
    estimated_duration_days INTEGER,
    estimated_cost_range JSONB, -- {min: 500, max: 1500, currency: "USD"}
    best_seasons TEXT[], -- ["spring", "summer", "fall", "winter"]
    
    -- Template sharing
    is_public BOOLEAN DEFAULT false,
    is_official BOOLEAN DEFAULT false, -- Created by Wheels & Wins team
    usage_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    
    -- Tags and search
    tags TEXT[],
    regions TEXT[], -- ["southwest", "pacific_coast", "rocky_mountains"]
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TRIP EXPENSES TABLE - Trip-specific expense tracking
CREATE TABLE IF NOT EXISTS public.trip_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.user_trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Expense details
    category TEXT NOT NULL CHECK (category IN (
        'fuel', 'accommodation', 'food', 'entertainment', 'repairs', 
        'tolls', 'supplies', 'groceries', 'dining', 'activities', 'other'
    )),
    subcategory TEXT, -- More specific categorization
    
    -- Financial data
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Transaction details
    description TEXT NOT NULL,
    vendor TEXT,
    location TEXT,
    payment_method TEXT, -- "cash", "credit", "debit"
    
    -- Timing and location
    expense_date DATE NOT NULL,
    coordinates POINT, -- Where the expense occurred
    
    -- Receipt and tracking
    receipt_url TEXT,
    is_planned BOOLEAN DEFAULT false, -- vs actual expense
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON public.user_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trips_status ON public.user_trips(status);
CREATE INDEX IF NOT EXISTS idx_user_trips_dates ON public.user_trips(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_user_trips_public ON public.user_trips(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_user_trips_template ON public.user_trips(is_template) WHERE is_template = true;

-- Spatial indexes for geographic queries
CREATE INDEX IF NOT EXISTS idx_user_trips_route_geometry ON public.user_trips USING GIST(route_geometry);
CREATE INDEX IF NOT EXISTS idx_trip_routes_geometry ON public.trip_routes USING GIST(route_geometry);
CREATE INDEX IF NOT EXISTS idx_trip_routes_bbox ON public.trip_routes USING GIST(bounding_box);
CREATE INDEX IF NOT EXISTS idx_trip_waypoints_coordinates ON public.trip_waypoints USING GIST(coordinates);

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_trip_routes_trip_id ON public.trip_routes(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_routes_type ON public.trip_routes(route_type);

CREATE INDEX IF NOT EXISTS idx_trip_waypoints_trip_id ON public.trip_waypoints(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_waypoints_route_id ON public.trip_waypoints(route_id);
CREATE INDEX IF NOT EXISTS idx_trip_waypoints_type ON public.trip_waypoints(waypoint_type);
CREATE INDEX IF NOT EXISTS idx_trip_waypoints_order ON public.trip_waypoints(trip_id, waypoint_order);

CREATE INDEX IF NOT EXISTS idx_trip_templates_category ON public.trip_templates(category);
CREATE INDEX IF NOT EXISTS idx_trip_templates_public ON public.trip_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_trip_templates_official ON public.trip_templates(is_official) WHERE is_official = true;

CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_id ON public.trip_expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_user_id ON public.trip_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_category ON public.trip_expenses(category);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_date ON public.trip_expenses(expense_date DESC);

-- Enable Row Level Security
ALTER TABLE public.user_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_trips
CREATE POLICY "Users can manage their own trips" ON public.user_trips
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public trips" ON public.user_trips
    FOR SELECT USING (is_public = true OR auth.uid() = user_id OR auth.uid() = ANY(shared_with_users));

CREATE POLICY "Users can view shared trips" ON public.user_trips
    FOR SELECT USING (auth.uid() = ANY(shared_with_users));

-- RLS Policies for trip_routes
CREATE POLICY "Users can manage routes for their trips" ON public.trip_routes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_trips WHERE id = trip_routes.trip_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can view routes for accessible trips" ON public.trip_routes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_trips 
            WHERE id = trip_routes.trip_id 
            AND (user_id = auth.uid() OR is_public = true OR auth.uid() = ANY(shared_with_users))
        )
    );

-- RLS Policies for trip_waypoints
CREATE POLICY "Users can manage waypoints for their trips" ON public.trip_waypoints
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_trips WHERE id = trip_waypoints.trip_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can view waypoints for accessible trips" ON public.trip_waypoints
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_trips 
            WHERE id = trip_waypoints.trip_id 
            AND (user_id = auth.uid() OR is_public = true OR auth.uid() = ANY(shared_with_users))
        )
    );

-- RLS Policies for trip_templates
CREATE POLICY "Users can manage their own templates" ON public.trip_templates
    FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Users can view public templates" ON public.trip_templates
    FOR SELECT USING (is_public = true OR auth.uid() = created_by);

-- RLS Policies for trip_expenses
CREATE POLICY "Users can manage their own trip expenses" ON public.trip_expenses
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Trip owners can view all expenses" ON public.trip_expenses
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_trips WHERE id = trip_expenses.trip_id AND user_id = auth.uid())
    );

-- Service role full access
CREATE POLICY "Service role has full access to trips" ON public.user_trips
    FOR ALL TO service_role USING (true);
CREATE POLICY "Service role has full access to routes" ON public.trip_routes
    FOR ALL TO service_role USING (true);
CREATE POLICY "Service role has full access to waypoints" ON public.trip_waypoints
    FOR ALL TO service_role USING (true);
CREATE POLICY "Service role has full access to templates" ON public.trip_templates
    FOR ALL TO service_role USING (true);
CREATE POLICY "Service role has full access to expenses" ON public.trip_expenses
    FOR ALL TO service_role USING (true);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_trips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_routes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_waypoints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_expenses TO authenticated;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_user_trips_updated_at ON public.user_trips;
CREATE TRIGGER update_user_trips_updated_at
    BEFORE UPDATE ON public.user_trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_waypoints_updated_at ON public.trip_waypoints;
CREATE TRIGGER update_trip_waypoints_updated_at
    BEFORE UPDATE ON public.trip_waypoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_templates_updated_at ON public.trip_templates;
CREATE TRIGGER update_trip_templates_updated_at
    BEFORE UPDATE ON public.trip_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper functions for trip management
CREATE OR REPLACE FUNCTION calculate_trip_distance(trip_id UUID)
RETURNS DECIMAL(10,3) AS $$
DECLARE
    total_distance DECIMAL(10,3) := 0;
BEGIN
    SELECT COALESCE(SUM(distance_km), 0) INTO total_distance
    FROM trip_routes 
    WHERE trip_routes.trip_id = calculate_trip_distance.trip_id;
    
    RETURN total_distance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_trip_bounding_box(trip_id UUID)
RETURNS GEOMETRY AS $$
DECLARE
    bbox GEOMETRY;
BEGIN
    SELECT ST_Envelope(ST_Collect(route_geometry)) INTO bbox
    FROM trip_routes 
    WHERE trip_routes.trip_id = get_trip_bounding_box.trip_id;
    
    RETURN bbox;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to copy trip as template
CREATE OR REPLACE FUNCTION create_trip_template(source_trip_id UUID, template_name TEXT)
RETURNS UUID AS $$
DECLARE
    new_template_id UUID;
    trip_data JSONB;
BEGIN
    -- Get trip data without user-specific information
    SELECT jsonb_build_object(
        'route_data', route_data,
        'vehicle_type', vehicle_type,
        'route_preferences', route_preferences,
        'estimated_duration_days', estimated_duration_days,
        'description', description,
        'tags', tags
    ) INTO trip_data
    FROM user_trips 
    WHERE id = source_trip_id;
    
    -- Create template
    INSERT INTO trip_templates (created_by, name, template_data, estimated_duration_days)
    SELECT user_id, template_name, trip_data, estimated_duration_days
    FROM user_trips 
    WHERE id = source_trip_id
    RETURNING id INTO new_template_id;
    
    RETURN new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON TABLE public.user_trips IS 'Individual user trip storage with comprehensive route and planning data';
COMMENT ON TABLE public.trip_routes IS 'Normalized route storage with geographic data and optimization metrics';
COMMENT ON TABLE public.trip_waypoints IS 'Structured waypoint management with services and timing information';
COMMENT ON TABLE public.trip_templates IS 'Reusable trip templates for common routes and trip types';
COMMENT ON TABLE public.trip_expenses IS 'Trip-specific expense tracking linked to individual trips';

COMMENT ON COLUMN public.user_trips.route_geometry IS 'PostGIS LineString for spatial queries and route visualization';
COMMENT ON COLUMN public.user_trips.shared_with_users IS 'Array of user UUIDs who have access to this trip';
COMMENT ON COLUMN public.trip_routes.route_geometry IS 'Detailed route path as PostGIS LineString';
COMMENT ON COLUMN public.trip_waypoints.coordinates IS 'PostGIS Point for precise waypoint location';