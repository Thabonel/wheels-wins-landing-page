-- Add image columns to trip_templates table
ALTER TABLE public.trip_templates 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS image_source TEXT,
ADD COLUMN IF NOT EXISTS image_attribution TEXT;

-- Create national_parks table for storing park information
CREATE TABLE IF NOT EXISTS public.national_parks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    alternate_names TEXT[],
    country TEXT NOT NULL,
    state_province TEXT,
    region TEXT,
    description TEXT,
    area_sq_km DECIMAL(10,2),
    established_date DATE,
    visitor_count_annual INTEGER,
    
    -- Location data
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    location_point GEOGRAPHY(POINT, 4326),
    boundaries JSONB, -- GeoJSON boundaries if available
    
    -- Images
    primary_image_url TEXT,
    thumbnail_url TEXT,
    image_gallery JSONB, -- Array of {url, caption, source, attribution}
    
    -- Features and activities
    main_features TEXT[],
    activities TEXT[],
    wildlife TEXT[],
    best_visiting_months TEXT[],
    climate_zone TEXT,
    
    -- Visitor information
    entrance_fee_info JSONB,
    operating_hours JSONB,
    contact_info JSONB,
    official_website TEXT,
    
    -- Camping and RV specific
    has_camping BOOLEAN DEFAULT false,
    rv_accessible BOOLEAN DEFAULT false,
    rv_length_limit_ft INTEGER,
    campground_count INTEGER,
    campground_info JSONB, -- Details about campgrounds
    
    -- Wikipedia data
    wikipedia_url TEXT,
    wikipedia_extract TEXT,
    wikipedia_page_id INTEGER,
    
    -- Metadata
    data_source TEXT, -- 'wikipedia', 'manual', 'api', etc.
    last_updated TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Search optimization
    search_vector tsvector,
    
    UNIQUE(name, country)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_national_parks_country ON public.national_parks(country);
CREATE INDEX IF NOT EXISTS idx_national_parks_state ON public.national_parks(state_province);
CREATE INDEX IF NOT EXISTS idx_national_parks_location ON public.national_parks USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_national_parks_search ON public.national_parks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_national_parks_rv_accessible ON public.national_parks(rv_accessible) WHERE rv_accessible = true;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_national_parks_search() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(array_to_string(NEW.main_features, ' '), '')), 'C') ||
        setweight(to_tsvector('english', coalesce(array_to_string(NEW.activities, ' '), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector
CREATE TRIGGER update_national_parks_search_trigger
BEFORE INSERT OR UPDATE ON public.national_parks
FOR EACH ROW
EXECUTE FUNCTION update_national_parks_search();

-- Create points_of_interest table for other attractions
CREATE TABLE IF NOT EXISTS public.points_of_interest (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    poi_type TEXT NOT NULL CHECK (poi_type IN (
        'landmark', 'museum', 'beach', 'mountain', 'lake', 'waterfall',
        'historic_site', 'scenic_viewpoint', 'attraction', 'natural_wonder'
    )),
    country TEXT NOT NULL,
    state_province TEXT,
    city TEXT,
    description TEXT,
    
    -- Location
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    location_point GEOGRAPHY(POINT, 4326),
    address TEXT,
    
    -- Images
    image_url TEXT,
    thumbnail_url TEXT,
    image_source TEXT,
    image_attribution TEXT,
    
    -- Details
    opening_hours JSONB,
    admission_fee TEXT,
    contact_info JSONB,
    website_url TEXT,
    
    -- RV specific
    rv_accessible BOOLEAN DEFAULT true,
    parking_available BOOLEAN DEFAULT true,
    parking_fee TEXT,
    
    -- Wikipedia data
    wikipedia_url TEXT,
    wikipedia_extract TEXT,
    
    -- Metadata
    tags TEXT[],
    rating DECIMAL(2,1),
    review_count INTEGER,
    data_source TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for points_of_interest
CREATE INDEX IF NOT EXISTS idx_poi_country ON public.points_of_interest(country);
CREATE INDEX IF NOT EXISTS idx_poi_type ON public.points_of_interest(poi_type);
CREATE INDEX IF NOT EXISTS idx_poi_location ON public.points_of_interest USING GIST(location_point);

-- Create RLS policies for national_parks
ALTER TABLE public.national_parks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "National parks are viewable by everyone" 
ON public.national_parks FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Only admins can modify national parks" 
ON public.national_parks FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.user_role = 'admin'
    )
);

-- Create RLS policies for points_of_interest
ALTER TABLE public.points_of_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Points of interest are viewable by everyone" 
ON public.points_of_interest FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Only admins can modify points of interest" 
ON public.points_of_interest FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.user_role = 'admin'
    )
);

-- Add function to find nearby national parks
CREATE OR REPLACE FUNCTION find_nearby_national_parks(
    lat DECIMAL,
    lng DECIMAL,
    radius_km INTEGER DEFAULT 100
) RETURNS TABLE (
    id UUID,
    name TEXT,
    distance_km DECIMAL,
    country TEXT,
    state_province TEXT,
    rv_accessible BOOLEAN,
    primary_image_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        np.id,
        np.name,
        ST_Distance(
            np.location_point::geography,
            ST_MakePoint(lng, lat)::geography
        ) / 1000 AS distance_km,
        np.country,
        np.state_province,
        np.rv_accessible,
        np.primary_image_url
    FROM public.national_parks np
    WHERE ST_DWithin(
        np.location_point::geography,
        ST_MakePoint(lng, lat)::geography,
        radius_km * 1000
    )
    ORDER BY distance_km
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_national_parks_updated_at BEFORE UPDATE
ON public.national_parks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_poi_updated_at BEFORE UPDATE
ON public.points_of_interest FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment on tables
COMMENT ON TABLE public.national_parks IS 'Stores information about national parks worldwide with RV-specific details';
COMMENT ON TABLE public.points_of_interest IS 'Stores various tourist attractions and landmarks';
COMMENT ON COLUMN public.national_parks.image_gallery IS 'JSON array of {url: string, caption: string, source: string, attribution: string}';
COMMENT ON COLUMN public.national_parks.campground_info IS 'JSON object with campground details including amenities, reservations, etc.';