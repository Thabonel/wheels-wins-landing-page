-- Create User Trips Tables
-- This migration creates the missing user_trips and group_trips tables
-- that the frontend expects but don't exist in the database

-- 1. Create user_trips table for individual user trips
CREATE TABLE IF NOT EXISTS user_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'planned', 'active', 'completed')),
  is_group_trip BOOLEAN DEFAULT false,
  destination JSONB, -- {lat, lng, name, address}
  budget DECIMAL(10,2),
  template_id UUID REFERENCES trip_templates(id) ON DELETE SET NULL,
  route_data JSONB, -- Stores waypoints, stops, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create group_trips junction table for sharing trips
CREATE TABLE IF NOT EXISTS group_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES user_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' 
    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);
CREATE INDEX IF NOT EXISTS idx_user_trips_start_date ON user_trips(start_date);
CREATE INDEX IF NOT EXISTS idx_group_trips_trip_id ON group_trips(trip_id);
CREATE INDEX IF NOT EXISTS idx_group_trips_user_id ON group_trips(user_id);

-- 4. Enable RLS
ALTER TABLE user_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_trips ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for user_trips
-- Users can see their own trips
CREATE POLICY "Users can view own trips" ON user_trips
  FOR SELECT USING (auth.uid() = user_id);

-- Users can also see trips they're part of (group trips)
CREATE POLICY "Users can view group trips they belong to" ON user_trips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_trips 
      WHERE group_trips.trip_id = user_trips.id 
      AND group_trips.user_id = auth.uid()
    )
  );

-- Users can create their own trips  
CREATE POLICY "Users can create own trips" ON user_trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own trips
CREATE POLICY "Users can update own trips" ON user_trips
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can update trips where they're admin
CREATE POLICY "Admins can update group trips" ON user_trips
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_trips 
      WHERE group_trips.trip_id = user_trips.id 
      AND group_trips.user_id = auth.uid()
      AND group_trips.role IN ('owner', 'admin')
    )
  );

-- Users can delete their own trips
CREATE POLICY "Users can delete own trips" ON user_trips
  FOR DELETE USING (auth.uid() = user_id);

-- 6. RLS Policies for group_trips
-- Users can see group memberships for trips they're part of
CREATE POLICY "Users can view group memberships" ON group_trips
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM group_trips gt 
      WHERE gt.trip_id = group_trips.trip_id 
      AND gt.user_id = auth.uid()
    )
  );

-- Trip owners can add members
CREATE POLICY "Trip owners can add members" ON group_trips
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_trips 
      WHERE user_trips.id = group_trips.trip_id 
      AND user_trips.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM group_trips existing
      WHERE existing.trip_id = group_trips.trip_id 
      AND existing.user_id = auth.uid()
      AND existing.role = 'owner'
    )
  );

-- Members can remove themselves
CREATE POLICY "Members can remove themselves" ON group_trips
  FOR DELETE USING (auth.uid() = user_id);

-- Owners and admins can remove others
CREATE POLICY "Owners can remove members" ON group_trips
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_trips owner_check
      WHERE owner_check.trip_id = group_trips.trip_id 
      AND owner_check.user_id = auth.uid()
      AND owner_check.role IN ('owner', 'admin')
    )
  );

-- 7. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 8. Add trigger to auto-update updated_at
CREATE TRIGGER update_user_trips_updated_at 
  BEFORE UPDATE ON user_trips 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. When a trip is created, automatically add creator as owner in group_trips
CREATE OR REPLACE FUNCTION add_creator_to_group_trips()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for group trips
  IF NEW.is_group_trip = true THEN
    INSERT INTO group_trips (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER add_trip_creator_as_owner
  AFTER INSERT ON user_trips
  FOR EACH ROW EXECUTE FUNCTION add_creator_to_group_trips();

-- 10. Migrate any existing trip_templates to user_trips (if user has templates)
-- This ensures users who created templates can see them as trips
INSERT INTO user_trips (
  user_id,
  title,
  description,
  status,
  template_id,
  created_at
)
SELECT DISTINCT
  profiles.user_id,
  trip_templates.name,
  trip_templates.description,
  'draft',
  trip_templates.id,
  trip_templates.created_at
FROM trip_templates
CROSS JOIN profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_trips 
  WHERE user_trips.template_id = trip_templates.id
)
LIMIT 5; -- Add a few sample trips for testing

-- 11. Verify the tables were created
DO $$ 
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('user_trips', 'group_trips');
  
  IF table_count < 2 THEN
    RAISE WARNING 'Not all trip tables were created successfully';
  ELSE
    RAISE NOTICE 'Trip tables created successfully';
  END IF;
END $$;