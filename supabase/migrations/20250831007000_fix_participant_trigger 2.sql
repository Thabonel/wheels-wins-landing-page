-- Fix Participant Trigger and Constraints
-- The group_trip_participants table has different role and status values

-- 1. First, check if the trigger exists and drop it
DROP TRIGGER IF EXISTS add_trip_creator_to_participants ON group_trips;
DROP FUNCTION IF EXISTS add_creator_as_participant();

-- 2. Create the corrected trigger function
CREATE OR REPLACE FUNCTION add_creator_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the trip creator as an organizer with accepted status
  INSERT INTO group_trip_participants (
    id,
    trip_id, 
    user_id, 
    role, 
    status,
    joined_at
  )
  VALUES (
    gen_random_uuid(),
    NEW.id, 
    NEW.created_by, 
    'organizer',  -- Fixed: use 'organizer' instead of 'owner'
    'accepted',   -- Fixed: use 'accepted' instead of 'active'
    NOW()
  )
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-create the trigger with the correct function
CREATE TRIGGER add_trip_creator_to_participants
  AFTER INSERT ON group_trips
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_participant();

-- 4. Fix any existing participants with wrong values
UPDATE group_trip_participants 
SET role = 'organizer' 
WHERE role IN ('owner', 'admin');

UPDATE group_trip_participants 
SET role = 'participant' 
WHERE role IN ('member', 'viewer');

UPDATE group_trip_participants 
SET status = 'accepted' 
WHERE status IN ('active', 'confirmed');

-- 5. Add unique constraint if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'group_trip_participants_trip_user_unique'
  ) THEN
    ALTER TABLE group_trip_participants
    ADD CONSTRAINT group_trip_participants_trip_user_unique 
    UNIQUE (trip_id, user_id);
  END IF;
END $$;

-- 6. Enable RLS on group_trip_participants
ALTER TABLE group_trip_participants ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies
DROP POLICY IF EXISTS "Users can view participants of trips they're in" ON group_trip_participants;
DROP POLICY IF EXISTS "Organizers can add participants" ON group_trip_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON group_trip_participants;
DROP POLICY IF EXISTS "Users can remove themselves" ON group_trip_participants;

-- 8. Create RLS policies for group_trip_participants
-- Users can see participants of trips they're part of
CREATE POLICY "Users can view participants of trips they're in" ON group_trip_participants
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM group_trip_participants gtp
      WHERE gtp.trip_id = group_trip_participants.trip_id
      AND gtp.user_id = auth.uid()
      AND gtp.status = 'accepted'
    )
  );

-- Organizers can add participants
CREATE POLICY "Organizers can add participants" ON group_trip_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_trip_participants gtp
      WHERE gtp.trip_id = group_trip_participants.trip_id
      AND gtp.user_id = auth.uid()
      AND gtp.role = 'organizer'
    ) OR
    EXISTS (
      SELECT 1 FROM group_trips gt
      WHERE gt.id = group_trip_participants.trip_id
      AND gt.created_by = auth.uid()
    )
  );

-- Users can update their own participation (accept/decline invites)
CREATE POLICY "Users can update their own participation" ON group_trip_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can remove themselves from trips
CREATE POLICY "Users can remove themselves" ON group_trip_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Organizers can remove participants
CREATE POLICY "Organizers can remove participants" ON group_trip_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_trip_participants gtp
      WHERE gtp.trip_id = group_trip_participants.trip_id
      AND gtp.user_id = auth.uid()
      AND gtp.role = 'organizer'
    )
  );

-- 9. Add the current user as organizer to any existing trips they created
INSERT INTO group_trip_participants (trip_id, user_id, role, status)
SELECT 
  gt.id,
  gt.created_by,
  'organizer',
  'accepted'
FROM group_trips gt
WHERE NOT EXISTS (
  SELECT 1 FROM group_trip_participants gtp
  WHERE gtp.trip_id = gt.id
  AND gtp.user_id = gt.created_by
)
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- 10. Test by creating a sample trip (will auto-add creator as organizer)
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
  'Desert Adventure Trip',
  'Exploring the Mojave Desert trails',
  'planning',
  CURRENT_DATE + interval '14 days',
  CURRENT_DATE + interval '17 days'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM group_trips 
  WHERE created_by = p.user_id 
  AND trip_name = 'Desert Adventure Trip'
)
LIMIT 1;

-- Verify the setup
DO $$ 
DECLARE
  participant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO participant_count
  FROM group_trip_participants;
  
  RAISE NOTICE 'Total participants in all trips: %', participant_count;
END $$;