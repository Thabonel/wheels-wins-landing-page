-- Fix Status Values and Complete Setup
-- This migration fixes the status constraint mismatch and completes the setup

-- 1. Fix the sample data insertion with correct status value
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
  'planning', -- Fixed: use 'planning' instead of 'planned'
  CURRENT_DATE + interval '7 days',
  CURRENT_DATE + interval '10 days'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM group_trips 
  WHERE created_by = p.user_id 
  AND trip_name = 'Sample Trip to Yosemite'
)
LIMIT 1;

-- 2. Update any existing trips with wrong status values
UPDATE group_trips 
SET status = 'planning' 
WHERE status = 'planned';

UPDATE group_trips 
SET status = 'planning' 
WHERE status = 'draft';

-- 3. Ensure RLS is enabled on all trip tables
ALTER TABLE group_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trips ENABLE ROW LEVEL SECURITY;

-- 4. Drop and recreate policies with correct permissions
-- For group_trips
DROP POLICY IF EXISTS "Users can view own trips" ON group_trips;
DROP POLICY IF EXISTS "Users can create own trips" ON group_trips;
DROP POLICY IF EXISTS "Users can update own trips" ON group_trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON group_trips;

CREATE POLICY "Users can view own trips" ON group_trips
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create own trips" ON group_trips
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own trips" ON group_trips
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own trips" ON group_trips
  FOR DELETE USING (auth.uid() = created_by);

-- 5. Add a second sample trip to test the trips list
INSERT INTO group_trips (
  id,
  created_by,
  trip_name,
  description,
  status,
  start_date,
  end_date,
  route_data
)
SELECT 
  gen_random_uuid(),
  p.user_id,
  'Weekend Coastal Drive',
  'Scenic drive along the Pacific Coast Highway',
  'active',
  CURRENT_DATE,
  CURRENT_DATE + interval '2 days',
  jsonb_build_object(
    'origin', ARRAY[-122.4194, 37.7749],
    'dest', ARRAY[-121.8863, 36.6002],
    'routingProfile', 'driving',
    'waypoints', '[]'::jsonb
  )
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM group_trips 
  WHERE created_by = p.user_id 
  AND trip_name = 'Weekend Coastal Drive'
)
LIMIT 1;

-- 6. Verify the data was inserted
DO $$ 
DECLARE
  trip_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trip_count
  FROM group_trips;
  
  RAISE NOTICE 'Total trips in database: %', trip_count;
END $$;