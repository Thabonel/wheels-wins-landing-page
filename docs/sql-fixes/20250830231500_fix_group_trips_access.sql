-- Fix Group Trips Access Issues
-- Allows creators to view their own trips and automatically adds them as participants

-- Add RLS policy for creators to view their own trips
CREATE POLICY "Creators can view their own trips" ON group_trips
  FOR SELECT USING (auth.uid() = created_by);

-- Add RLS policy for creators to delete their own trips  
CREATE POLICY "Creators can delete their own trips" ON group_trips
  FOR DELETE USING (auth.uid() = created_by);

-- Function to automatically add creator as participant when trip is created
CREATE OR REPLACE FUNCTION add_creator_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the creator as an owner/participant
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
    'owner', 
    'active',
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add creator as participant
DROP TRIGGER IF EXISTS add_creator_participant_trigger ON group_trips;
CREATE TRIGGER add_creator_participant_trigger
  AFTER INSERT ON group_trips
  FOR EACH ROW 
  EXECUTE FUNCTION add_creator_as_participant();

-- Add any existing trip creators as participants (for existing data)
INSERT INTO group_trip_participants (id, trip_id, user_id, role, status, joined_at)
SELECT 
  gen_random_uuid(),
  gt.id,
  gt.created_by,
  'owner',
  'active',
  gt.created_at
FROM group_trips gt
LEFT JOIN group_trip_participants gtp ON gt.id = gtp.trip_id AND gt.created_by = gtp.user_id
WHERE gtp.id IS NULL;