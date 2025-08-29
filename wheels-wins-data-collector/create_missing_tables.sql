-- Create missing tables for Wheels & Wins data collection
-- Run this in your Supabase SQL editor before importing data

-- Create camping_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.camping_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    location_type TEXT,
    country TEXT NOT NULL,
    state_province TEXT,
    region TEXT,
    description TEXT,
    latitude DECIMAL(10,6) NOT NULL,
    longitude DECIMAL(10,6) NOT NULL,
    location_point GEOGRAPHY(POINT, 4326),
    address TEXT,
    
    -- Camping specific
    is_free BOOLEAN DEFAULT false,
    price_per_night DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    amenities JSONB,
    capacity INTEGER,
    max_rig_length INTEGER,
    elevation_meters INTEGER,
    
    -- Contact
    phone TEXT,
    email TEXT,
    website TEXT,
    reservation_url TEXT,
    
    -- Seasonal info
    season_start TEXT,
    season_end TEXT,
    
    -- Images
    image_url TEXT,
    images JSONB,
    
    -- Reviews
    rating DECIMAL(2,1),
    review_count INTEGER,
    
    -- Metadata
    tags TEXT[],
    data_source TEXT,
    source_id TEXT,
    last_verified TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create swimming_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.swimming_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    swimming_type TEXT CHECK (swimming_type IN (
        'ocean_beach', 'lake', 'river', 'waterfall', 'pool', 
        'hot_spring', 'swimming_hole', 'lagoon', 'bay'
    )),
    water_type TEXT CHECK (water_type IN (
        'saltwater', 'freshwater', 'chlorinated', 'mineral', 'thermal'
    )),
    country TEXT NOT NULL,
    state_province TEXT,
    region TEXT,
    description TEXT,
    latitude DECIMAL(10,6) NOT NULL,
    longitude DECIMAL(10,6) NOT NULL,
    location_point GEOGRAPHY(POINT, 4326),
    address TEXT,
    
    -- Swimming specific
    facilities JSONB,
    safety_info TEXT,
    water_quality TEXT,
    temperature_range TEXT,
    best_season TEXT,
    accessibility JSONB,
    
    -- Access info
    parking_available BOOLEAN DEFAULT true,
    entry_fee DECIMAL(10,2),
    lifeguard_hours TEXT,
    
    -- Images
    image_url TEXT,
    images JSONB,
    
    -- Reviews
    rating DECIMAL(2,1),
    review_count INTEGER,
    
    -- Metadata
    tags TEXT[],
    data_source TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_camping_locations_country ON public.camping_locations(country);
CREATE INDEX IF NOT EXISTS idx_camping_locations_free ON public.camping_locations(is_free) WHERE is_free = true;
CREATE INDEX IF NOT EXISTS idx_camping_locations_location ON public.camping_locations USING GIST(location_point);

CREATE INDEX IF NOT EXISTS idx_swimming_locations_country ON public.swimming_locations(country);
CREATE INDEX IF NOT EXISTS idx_swimming_locations_type ON public.swimming_locations(swimming_type);
CREATE INDEX IF NOT EXISTS idx_swimming_locations_location ON public.swimming_locations USING GIST(location_point);

-- Update location_point triggers
CREATE OR REPLACE FUNCTION update_location_point() RETURNS trigger AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location_point := ST_MakePoint(NEW.longitude, NEW.latitude)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_camping_location_point 
BEFORE INSERT OR UPDATE ON public.camping_locations
FOR EACH ROW EXECUTE FUNCTION update_location_point();

CREATE TRIGGER update_swimming_location_point 
BEFORE INSERT OR UPDATE ON public.swimming_locations
FOR EACH ROW EXECUTE FUNCTION update_location_point();

-- Enable RLS
ALTER TABLE public.camping_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swimming_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (read for all, write for authenticated)
CREATE POLICY "Camping locations are viewable by everyone" 
ON public.camping_locations FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Only authenticated users can modify camping locations" 
ON public.camping_locations FOR ALL 
TO authenticated 
USING (true);

CREATE POLICY "Swimming locations are viewable by everyone" 
ON public.swimming_locations FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Only authenticated users can modify swimming locations" 
ON public.swimming_locations FOR ALL 
TO authenticated 
USING (true);

-- Update timestamp triggers
CREATE TRIGGER update_camping_locations_updated_at BEFORE UPDATE
ON public.camping_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_swimming_locations_updated_at BEFORE UPDATE
ON public.swimming_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.camping_locations IS 'Stores camping spots including free camping, RV parks, and campgrounds';
COMMENT ON TABLE public.swimming_locations IS 'Stores swimming spots including beaches, lakes, pools, and waterfalls';

COMMENT ON COLUMN public.camping_locations.amenities IS 'JSON object with amenity flags like {toilets: true, water: true, electricity: false}';
COMMENT ON COLUMN public.swimming_locations.facilities IS 'JSON object with facility info like {lifeguard: true, changerooms: true, parking: "free"}';

-- Verify tables were created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('national_parks', 'camping_locations', 'points_of_interest', 'swimming_locations')
ORDER BY table_name;