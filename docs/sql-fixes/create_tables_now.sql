-- Run this SQL in your Supabase SQL editor
-- https://app.supabase.com/project/kycoklimpzkyrecbjecn/sql/new


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
            is_free BOOLEAN DEFAULT false,
            price_per_night DECIMAL(10,2),
            currency TEXT DEFAULT 'USD',
            amenities JSONB,
            capacity INTEGER,
            max_rig_length INTEGER,
            elevation_meters INTEGER,
            phone TEXT,
            email TEXT,
            website TEXT,
            reservation_url TEXT,
            season_start TEXT,
            season_end TEXT,
            image_url TEXT,
            images JSONB,
            rating DECIMAL(2,1),
            review_count INTEGER,
            tags TEXT[],
            data_source TEXT,
            source_id TEXT,
            last_verified TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )
        ;


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
            facilities JSONB,
            safety_info TEXT,
            water_quality TEXT,
            temperature_range TEXT,
            best_season TEXT,
            accessibility JSONB,
            parking_available BOOLEAN DEFAULT true,
            entry_fee DECIMAL(10,2),
            lifeguard_hours TEXT,
            image_url TEXT,
            images JSONB,
            rating DECIMAL(2,1),
            review_count INTEGER,
            tags TEXT[],
            data_source TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )
        ;

CREATE INDEX IF NOT EXISTS idx_camping_locations_country ON public.camping_locations(country);

CREATE INDEX IF NOT EXISTS idx_camping_locations_free ON public.camping_locations(is_free) WHERE is_free = true;

CREATE INDEX IF NOT EXISTS idx_camping_locations_location ON public.camping_locations USING GIST(location_point);

CREATE INDEX IF NOT EXISTS idx_swimming_locations_country ON public.swimming_locations(country);

CREATE INDEX IF NOT EXISTS idx_swimming_locations_type ON public.swimming_locations(swimming_type);

CREATE INDEX IF NOT EXISTS idx_swimming_locations_location ON public.swimming_locations USING GIST(location_point);


        CREATE OR REPLACE FUNCTION update_location_point() RETURNS trigger AS $$
        BEGIN
            IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
                NEW.location_point := ST_MakePoint(NEW.longitude, NEW.latitude)::geography;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        ;


        CREATE TRIGGER update_camping_location_point 
        BEFORE INSERT OR UPDATE ON public.camping_locations
        FOR EACH ROW EXECUTE FUNCTION update_location_point()
        ;


        CREATE TRIGGER update_swimming_location_point 
        BEFORE INSERT OR UPDATE ON public.swimming_locations
        FOR EACH ROW EXECUTE FUNCTION update_location_point()
        ;


        CREATE TRIGGER update_camping_locations_updated_at 
        BEFORE UPDATE ON public.camping_locations 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        ;


        CREATE TRIGGER update_swimming_locations_updated_at 
        BEFORE UPDATE ON public.swimming_locations 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        ;

