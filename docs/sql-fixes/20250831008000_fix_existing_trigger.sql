-- Fix Existing Trigger and Participant Constraints
-- Drop existing triggers first, then recreate with correct values

-- 1. Drop ALL existing triggers that use the add_creator_as_participant function
DROP TRIGGER IF EXISTS add_creator_participant_trigger ON group_trips;
DROP TRIGGER IF EXISTS add_trip_creator_to_participants ON group_trips;
DROP TRIGGER IF EXISTS add_trip_creator_as_owner ON group_trips;

-- 2. Now we can safely drop and recreate the function
DROP FUNCTION IF EXISTS add_creator_as_participant() CASCADE;

-- 3. Create the corrected trigger function with proper values
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
    'organizer',  -- Must be 'organizer' or 'participant'
    'accepted',   -- Must be 'invited', 'accepted', or 'declined'
    NOW()
  )
  ON CONFLICT (trip_id, user_id) DO UPDATE
  SET 
    role = 'organizer',
    status = 'accepted';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger with a consistent name
CREATE TRIGGER add_creator_participant_trigger
  AFTER INSERT ON group_trips
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_participant();

-- 5. Fix any existing participants with wrong values
UPDATE group_trip_participants 
SET role = 'organizer' 
WHERE role IN ('owner', 'admin');

UPDATE group_trip_participants 
SET role = 'participant' 
WHERE role IN ('member', 'viewer');

UPDATE group_trip_participants 
SET status = 'accepted' 
WHERE status IN ('active', 'confirmed', 'joined');

UPDATE group_trip_participants 
SET status = 'invited' 
WHERE status IN ('pending', 'waiting');

-- 6. Add unique constraint if missing
ALTER TABLE group_trip_participants 
DROP CONSTRAINT IF EXISTS group_trip_participants_trip_user_unique;

ALTER TABLE group_trip_participants
ADD CONSTRAINT group_trip_participants_trip_user_unique 
UNIQUE (trip_id, user_id);

-- 7. Enable RLS on group_trip_participants
ALTER TABLE group_trip_participants ENABLE ROW LEVEL SECURITY;

-- 8. Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'group_trip_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON group_trip_participants', pol.policyname);
    END LOOP;
END $$;

-- 9. Create clean RLS policies for group_trip_participants
-- Users can see participants of trips they're part of
CREATE POLICY "view_participants" ON group_trip_participants
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM group_trip_participants gtp
      WHERE gtp.trip_id = group_trip_participants.trip_id
      AND gtp.user_id = auth.uid()
      AND gtp.status = 'accepted'
    )
  );

-- Trip creators and organizers can add participants
CREATE POLICY "add_participants" ON group_trip_participants
  FOR INSERT WITH CHECK (
    -- User is the trip creator
    EXISTS (
      SELECT 1 FROM group_trips gt
      WHERE gt.id = group_trip_participants.trip_id
      AND gt.created_by = auth.uid()
    ) OR
    -- User is an organizer of this trip
    EXISTS (
      SELECT 1 FROM group_trip_participants gtp
      WHERE gtp.trip_id = group_trip_participants.trip_id
      AND gtp.user_id = auth.uid()
      AND gtp.role = 'organizer'
      AND gtp.status = 'accepted'
    )
  );

-- Users can update their own participation (accept/decline invites)
CREATE POLICY "update_own_participation" ON group_trip_participants
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can remove themselves from trips
CREATE POLICY "remove_self" ON group_trip_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Organizers can remove other participants
CREATE POLICY "organizers_remove_participants" ON group_trip_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_trip_participants gtp
      WHERE gtp.trip_id = group_trip_participants.trip_id
      AND gtp.user_id = auth.uid()
      AND gtp.role = 'organizer'
      AND gtp.status = 'accepted'
    )
  );

-- 10. Ensure all existing trips have their creators as organizers
INSERT INTO group_trip_participants (trip_id, user_id, role, status, joined_at)
SELECT 
  gt.id,
  gt.created_by,
  'organizer',
  'accepted',
  COALESCE(gt.created_at, NOW())
FROM group_trips gt
WHERE NOT EXISTS (
  SELECT 1 FROM group_trip_participants gtp
  WHERE gtp.trip_id = gt.id
  AND gtp.user_id = gt.created_by
)
ON CONFLICT (trip_id, user_id) 
DO UPDATE SET 
  role = 'organizer',
  status = 'accepted';

-- 11. Clean up any orphaned participants (where trip doesn't exist)
DELETE FROM group_trip_participants
WHERE NOT EXISTS (
  SELECT 1 FROM group_trips 
  WHERE group_trips.id = group_trip_participants.trip_id
);

-- 12. Verify the setup
DO $$ 
DECLARE
  trip_count INTEGER;
  participant_count INTEGER;
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trip_count FROM group_trips;
  SELECT COUNT(*) INTO participant_count FROM group_trip_participants;
  
  -- Check for trips without organizers
  SELECT COUNT(*) INTO orphan_count
  FROM group_trips gt
  WHERE NOT EXISTS (
    SELECT 1 FROM group_trip_participants gtp
    WHERE gtp.trip_id = gt.id
    AND gtp.role = 'organizer'
  );
  
  RAISE NOTICE 'Setup complete: % trips, % participants', trip_count, participant_count;
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % trips without organizers!', orphan_count;
  END IF;
END $$;