-- Fix Existing Trips Tables
-- The tables already exist but with different structures
-- This migration adjusts them to work with the frontend

-- 1. Add missing columns to user_trips if they don't exist
ALTER TABLE user_trips 
ADD COLUMN IF NOT EXISTS is_group_trip BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS destination JSONB,
ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES trip_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS route_data JSONB;

-- 2. Add constraint for status if not exists
DO $$ 
BEGIN
  -- Check if constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_trips_status_check'
  ) THEN
    ALTER TABLE user_trips 
    ADD CONSTRAINT user_trips_status_check 
    CHECK (status IN ('draft', 'planned', 'active', 'completed'));
  END IF;
END $$;

-- 3. Create group_trip_members table (since group_trips is already used for actual trips)
CREATE TABLE IF NOT EXISTS group_trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' 
    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- Add foreign key to either user_trips or group_trips depending on which is used
DO $$ 
BEGIN
  -- Try to add foreign key to group_trips first (the existing main trips table)
  BEGIN
    ALTER TABLE group_trip_members 
    ADD CONSTRAINT group_trip_members_trip_id_fkey 
    FOREIGN KEY (trip_id) REFERENCES group_trips(id) ON DELETE CASCADE;
  EXCEPTION WHEN others THEN
    -- If that fails, try user_trips
    ALTER TABLE group_trip_members 
    ADD CONSTRAINT group_trip_members_trip_id_fkey 
    FOREIGN KEY (trip_id) REFERENCES user_trips(id) ON DELETE CASCADE;
  END;
END $$;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);
CREATE INDEX IF NOT EXISTS idx_user_trips_start_date ON user_trips(start_date);
CREATE INDEX IF NOT EXISTS idx_group_trip_members_trip_id ON group_trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_group_trip_members_user_id ON group_trip_members(user_id);

-- 5. Enable RLS
ALTER TABLE user_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_trip_members ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own trips" ON user_trips;
DROP POLICY IF EXISTS "Users can view group trips they belong to" ON user_trips;
DROP POLICY IF EXISTS "Users can create own trips" ON user_trips;
DROP POLICY IF EXISTS "Users can update own trips" ON user_trips;
DROP POLICY IF EXISTS "Admins can update group trips" ON user_trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON user_trips;

DROP POLICY IF EXISTS "Users can view own trips" ON group_trips;
DROP POLICY IF EXISTS "Users can create own trips" ON group_trips;
DROP POLICY IF EXISTS "Users can update own trips" ON group_trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON group_trips;

-- 7. Create RLS policies for user_trips
CREATE POLICY "Users can view own trips" ON user_trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trips" ON user_trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON user_trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON user_trips
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Create RLS policies for group_trips (the existing trips table)
CREATE POLICY "Users can view own trips" ON group_trips
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create own trips" ON group_trips
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own trips" ON group_trips
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own trips" ON group_trips
  FOR DELETE USING (auth.uid() = created_by);

-- 9. Create RLS policies for group_trip_members
CREATE POLICY "Users can view members of trips they belong to" ON group_trip_members
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM group_trip_members gtm 
      WHERE gtm.trip_id = group_trip_members.trip_id 
      AND gtm.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip owners can add members" ON group_trip_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_trips 
      WHERE group_trips.id = group_trip_members.trip_id 
      AND group_trips.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_trips 
      WHERE user_trips.id = group_trip_members.trip_id 
      AND user_trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can remove themselves" ON group_trip_members
  FOR DELETE USING (auth.uid() = user_id);

-- 10. Create or replace function to add user_id to user_trips if missing
DO $$ 
BEGIN
  -- Update any user_trips records that have NULL user_id
  UPDATE user_trips 
  SET user_id = (SELECT user_id FROM profiles LIMIT 1)
  WHERE user_id IS NULL;
  
  -- Make user_id NOT NULL if it isn't already
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_trips' 
    AND column_name = 'user_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE user_trips ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- 11. Create updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Add triggers
DROP TRIGGER IF EXISTS update_user_trips_updated_at ON user_trips;
CREATE TRIGGER update_user_trips_updated_at 
  BEFORE UPDATE ON user_trips 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_trips_updated_at ON group_trips;
CREATE TRIGGER update_group_trips_updated_at 
  BEFORE UPDATE ON group_trips 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Add some sample data if tables are empty
INSERT INTO group_trips (
  id,
  created_by,
  trip_name,
  description,
  status,
  start_date,
  end_date
)
SELECT 
  gen_random_uuid(),
  p.user_id,
  'Sample Trip to Yosemite',
  'A beautiful camping trip to explore Yosemite National Park',
  'planned',
  CURRENT_DATE + interval '7 days',
  CURRENT_DATE + interval '10 days'
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM group_trips WHERE created_by = p.user_id)
LIMIT 1;

-- 13. Verify tables
DO $$ 
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('user_trips', 'group_trips', 'group_trip_members');
  
  IF table_count < 3 THEN
    RAISE WARNING 'Not all trip tables exist. Found % tables', table_count;
  ELSE
    RAISE NOTICE 'All trip tables configured successfully';
  END IF;
END $$;