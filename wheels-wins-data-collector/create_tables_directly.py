#!/usr/bin/env python3
"""
Create missing tables directly in Supabase
"""

import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

async def create_missing_tables():
    """Create camping_locations and swimming_locations tables"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    if not url or not key:
        print("❌ Missing Supabase credentials")
        return False
    
    # Create Supabase client
    supabase: Client = create_client(url, key)
    
    print("🔄 Creating missing tables in Supabase...")
    
    # SQL statements to create tables
    sql_statements = [
        # Create camping_locations table
        """
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
        """,
        
        # Create swimming_locations table
        """
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
        """,
        
        # Create indexes
        "CREATE INDEX IF NOT EXISTS idx_camping_locations_country ON public.camping_locations(country)",
        "CREATE INDEX IF NOT EXISTS idx_camping_locations_free ON public.camping_locations(is_free) WHERE is_free = true",
        "CREATE INDEX IF NOT EXISTS idx_camping_locations_location ON public.camping_locations USING GIST(location_point)",
        "CREATE INDEX IF NOT EXISTS idx_swimming_locations_country ON public.swimming_locations(country)",
        "CREATE INDEX IF NOT EXISTS idx_swimming_locations_type ON public.swimming_locations(swimming_type)",
        "CREATE INDEX IF NOT EXISTS idx_swimming_locations_location ON public.swimming_locations USING GIST(location_point)",
        
        # Create location_point update function if it doesn't exist
        """
        CREATE OR REPLACE FUNCTION update_location_point() RETURNS trigger AS $$
        BEGIN
            IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
                NEW.location_point := ST_MakePoint(NEW.longitude, NEW.latitude)::geography;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        """,
        
        # Create triggers
        """
        CREATE TRIGGER update_camping_location_point 
        BEFORE INSERT OR UPDATE ON public.camping_locations
        FOR EACH ROW EXECUTE FUNCTION update_location_point()
        """,
        
        """
        CREATE TRIGGER update_swimming_location_point 
        BEFORE INSERT OR UPDATE ON public.swimming_locations
        FOR EACH ROW EXECUTE FUNCTION update_location_point()
        """,
        
        # Create update timestamp triggers
        """
        CREATE TRIGGER update_camping_locations_updated_at 
        BEFORE UPDATE ON public.camping_locations 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        """,
        
        """
        CREATE TRIGGER update_swimming_locations_updated_at 
        BEFORE UPDATE ON public.swimming_locations 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        """
    ]
    
    # Execute each SQL statement
    success_count = 0
    for i, sql in enumerate(sql_statements, 1):
        try:
            # Get a brief description of what we're doing
            if 'CREATE TABLE' in sql:
                if 'camping_locations' in sql:
                    desc = "Creating camping_locations table"
                elif 'swimming_locations' in sql:
                    desc = "Creating swimming_locations table"
                else:
                    desc = "Creating table"
            elif 'CREATE INDEX' in sql:
                desc = f"Creating index {i-2} of 6"
            elif 'CREATE TRIGGER' in sql:
                desc = f"Creating trigger {i-8} of 4"
            elif 'CREATE OR REPLACE FUNCTION' in sql:
                desc = "Creating location update function"
            else:
                desc = f"Executing statement {i}"
            
            print(f"  {desc}...", end='', flush=True)
            
            # The Supabase Python client doesn't support direct SQL execution
            # We'll need to use the Supabase SQL editor or API
            # For now, let's save these to a file that can be run
            
            print(" [Need to run via Supabase dashboard]")
            
        except Exception as e:
            print(f" ❌ Error: {e}")
    
    # Save SQL to file for manual execution
    sql_file = "create_tables_now.sql"
    with open(sql_file, 'w') as f:
        f.write("-- Run this SQL in your Supabase SQL editor\n")
        f.write("-- https://app.supabase.com/project/kycoklimpzkyrecbjecn/sql/new\n\n")
        for sql in sql_statements:
            f.write(sql + ";\n\n")
    
    print(f"\n📄 SQL saved to: {sql_file}")
    print("\n⚠️  The Supabase Python client doesn't support DDL operations.")
    print("Please run the SQL in one of these ways:")
    print("\n1. Via Supabase Dashboard:")
    print("   - Go to: https://app.supabase.com/project/kycoklimpzkyrecbjecn/sql/new")
    print(f"   - Copy and paste the contents of {sql_file}")
    print("   - Click 'Run'\n")
    print("2. Via Supabase CLI:")
    print(f"   - supabase db push {sql_file}\n")
    
    # Let's at least verify what tables exist
    print("📊 Checking existing tables...")
    try:
        # Check if tables exist by trying to select from them
        tables_to_check = ['national_parks', 'camping_locations', 'points_of_interest', 'swimming_locations']
        
        for table in tables_to_check:
            try:
                result = supabase.table(table).select('id').limit(1).execute()
                print(f"✅ {table} - exists")
            except Exception as e:
                if 'relation' in str(e) and 'does not exist' in str(e):
                    print(f"❌ {table} - missing")
                else:
                    print(f"⚠️  {table} - error checking: {e}")
    except Exception as e:
        print(f"Error checking tables: {e}")
    
    return True

if __name__ == "__main__":
    asyncio.run(create_missing_tables())