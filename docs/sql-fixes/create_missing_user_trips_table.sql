-- Fix Saved Trips Issue: Create Missing user_trips Table
-- Run this in your Supabase SQL Editor to fix the saved trips functionality

-- 1. Create user_trips table for individual user trips
CREATE TABLE IF NOT EXISTS user_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('draft', 'planning', 'active', 'completed')),
  trip_type TEXT DEFAULT 'road_trip',
  total_budget DECIMAL(10,2),
  spent_budget DECIMAL(10,2) DEFAULT 0,
  privacy_level TEXT DEFAULT 'private'
    CHECK (privacy_level IN ('private', 'public', 'shared')),
  metadata JSONB DEFAULT '{}', -- Stores route_data, waypoints, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);
CREATE INDEX IF NOT EXISTS idx_user_trips_created_at ON user_trips(created_at);

-- 3. Enable RLS
ALTER TABLE user_trips ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Users can see their own trips
CREATE POLICY "Users can view own trips" ON user_trips
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own trips
CREATE POLICY "Users can insert own trips" ON user_trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own trips
CREATE POLICY "Users can update own trips" ON user_trips
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own trips
CREATE POLICY "Users can delete own trips" ON user_trips
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 6. Add trigger to auto-update updated_at
CREATE TRIGGER update_user_trips_updated_at
  BEFORE UPDATE ON user_trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Verify the table was created
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_trips'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '✅ user_trips table created successfully!';
  ELSE
    RAISE WARNING '❌ user_trips table creation failed';
  END IF;
END $$;