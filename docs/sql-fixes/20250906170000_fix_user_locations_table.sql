-- Fix user_locations table for PAM location services
-- This addresses the "ON CONFLICT specification" error

-- Create user_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_latitude DECIMAL(10, 8) NOT NULL,
    current_longitude DECIMAL(11, 8) NOT NULL,
    destination_latitude DECIMAL(10, 8),
    destination_longitude DECIMAL(11, 8),
    status VARCHAR(50) DEFAULT 'active',
    preferences JSONB DEFAULT '{}',
    travel_radius_miles INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add unique constraint on user_id for upsert operations
    CONSTRAINT user_locations_user_id_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own location" ON user_locations;
DROP POLICY IF EXISTS "Users can manage own location" ON user_locations;
DROP POLICY IF EXISTS "Users can insert own location" ON user_locations;
DROP POLICY IF EXISTS "Users can update own location" ON user_locations;
DROP POLICY IF EXISTS "Users can delete own location" ON user_locations;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view own location" ON user_locations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own location" ON user_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own location" ON user_locations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own location" ON user_locations
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS user_locations_user_id_idx ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS user_locations_updated_at_idx ON user_locations(updated_at);

-- Add comment explaining the table
COMMENT ON TABLE user_locations IS 'Stores user location data for PAM services including current position and travel preferences';