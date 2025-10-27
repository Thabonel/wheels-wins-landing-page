-- Life Transition Navigator: Room Inventory System
-- Migration: 200_room_inventory.sql
-- Purpose: Tables for downsizing room-by-room tracking

-- =======================
-- ROOMS TABLE
-- =======================

CREATE TABLE IF NOT EXISTS transition_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Room details
  name TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'custom'
    CHECK (room_type IN ('living_room', 'bedroom', 'kitchen', 'bathroom', 'garage', 'storage', 'office', 'other', 'custom')),
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),

  -- Progress tracking
  total_items INTEGER DEFAULT 0,
  decided_items INTEGER DEFAULT 0,
  completion_percentage INTEGER GENERATED ALWAYS AS (
    CASE WHEN total_items > 0 THEN LEAST(100, FLOOR((decided_items::DECIMAL / total_items::DECIMAL) * 100))
    ELSE 0 END
  ) STORED,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- ITEMS TABLE
-- =======================

CREATE TABLE IF NOT EXISTS transition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES transition_rooms(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Item details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,

  -- Decision tracking
  decision TEXT
    CHECK (decision IN ('keep', 'sell', 'donate', 'store', 'trash', 'parking_lot', NULL)),
  decision_date TIMESTAMPTZ,

  -- Metadata
  estimated_value DECIMAL(10, 2),
  emotional_difficulty INTEGER CHECK (emotional_difficulty >= 1 AND emotional_difficulty <= 5),
  photo_url TEXT,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- INDEXES
-- =======================

CREATE INDEX idx_transition_rooms_profile ON transition_rooms(profile_id);
CREATE INDEX idx_transition_rooms_user ON transition_rooms(user_id);
CREATE INDEX idx_transition_rooms_status ON transition_rooms(status);

CREATE INDEX idx_transition_items_room ON transition_items(room_id);
CREATE INDEX idx_transition_items_profile ON transition_items(profile_id);
CREATE INDEX idx_transition_items_user ON transition_items(user_id);
CREATE INDEX idx_transition_items_decision ON transition_items(decision);

-- =======================
-- ROW LEVEL SECURITY
-- =======================

ALTER TABLE transition_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE transition_items ENABLE ROW LEVEL SECURITY;

-- Rooms policies
CREATE POLICY "Users can view their own rooms"
ON transition_rooms FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own rooms"
ON transition_rooms FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own rooms"
ON transition_rooms FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own rooms"
ON transition_rooms FOR DELETE
USING (user_id = auth.uid());

-- Items policies
CREATE POLICY "Users can view their own items"
ON transition_items FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own items"
ON transition_items FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own items"
ON transition_items FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own items"
ON transition_items FOR DELETE
USING (user_id = auth.uid());

-- =======================
-- TRIGGERS
-- =======================

-- Update room counts when items change
CREATE OR REPLACE FUNCTION update_room_item_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the room's item counts
  UPDATE transition_rooms
  SET
    total_items = (
      SELECT COUNT(*)
      FROM transition_items
      WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
    ),
    decided_items = (
      SELECT COUNT(*)
      FROM transition_items
      WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
        AND decision IS NOT NULL
        AND decision != 'parking_lot'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.room_id, OLD.room_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_room_counts_on_insert
AFTER INSERT ON transition_items
FOR EACH ROW
EXECUTE FUNCTION update_room_item_counts();

CREATE TRIGGER trigger_update_room_counts_on_update
AFTER UPDATE ON transition_items
FOR EACH ROW
EXECUTE FUNCTION update_room_item_counts();

CREATE TRIGGER trigger_update_room_counts_on_delete
AFTER DELETE ON transition_items
FOR EACH ROW
EXECUTE FUNCTION update_room_item_counts();

-- Auto-update room status based on completion
CREATE OR REPLACE FUNCTION update_room_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completion_percentage = 100 THEN
    NEW.status := 'completed';
  ELSIF NEW.decided_items > 0 THEN
    NEW.status := 'in_progress';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_room_status
BEFORE UPDATE ON transition_rooms
FOR EACH ROW
WHEN (OLD.decided_items IS DISTINCT FROM NEW.decided_items)
EXECUTE FUNCTION update_room_status();

-- =======================
-- HELPER FUNCTIONS
-- =======================

-- Create default rooms for a new profile
CREATE OR REPLACE FUNCTION create_default_rooms(
  p_profile_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  INSERT INTO transition_rooms (profile_id, user_id, name, room_type)
  VALUES
    (p_profile_id, p_user_id, 'Living Room', 'living_room'),
    (p_profile_id, p_user_id, 'Master Bedroom', 'bedroom'),
    (p_profile_id, p_user_id, 'Kitchen', 'kitchen'),
    (p_profile_id, p_user_id, 'Bathroom', 'bathroom'),
    (p_profile_id, p_user_id, 'Garage', 'garage'),
    (p_profile_id, p_user_id, 'Storage/Attic', 'storage');
END;
$$ LANGUAGE plpgsql;

-- Get downsizing summary statistics
CREATE OR REPLACE FUNCTION get_downsizing_stats(p_profile_id UUID)
RETURNS TABLE(
  total_rooms INTEGER,
  completed_rooms INTEGER,
  total_items INTEGER,
  decided_items INTEGER,
  keep_count INTEGER,
  sell_count INTEGER,
  donate_count INTEGER,
  store_count INTEGER,
  trash_count INTEGER,
  parking_lot_count INTEGER,
  estimated_sale_value DECIMAL(10, 2),
  overall_completion INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM transition_rooms WHERE profile_id = p_profile_id),
    (SELECT COUNT(*)::INTEGER FROM transition_rooms WHERE profile_id = p_profile_id AND status = 'completed'),
    (SELECT COUNT(*)::INTEGER FROM transition_items WHERE profile_id = p_profile_id),
    (SELECT COUNT(*)::INTEGER FROM transition_items WHERE profile_id = p_profile_id AND decision IS NOT NULL AND decision != 'parking_lot'),
    (SELECT COUNT(*)::INTEGER FROM transition_items WHERE profile_id = p_profile_id AND decision = 'keep'),
    (SELECT COUNT(*)::INTEGER FROM transition_items WHERE profile_id = p_profile_id AND decision = 'sell'),
    (SELECT COUNT(*)::INTEGER FROM transition_items WHERE profile_id = p_profile_id AND decision = 'donate'),
    (SELECT COUNT(*)::INTEGER FROM transition_items WHERE profile_id = p_profile_id AND decision = 'store'),
    (SELECT COUNT(*)::INTEGER FROM transition_items WHERE profile_id = p_profile_id AND decision = 'trash'),
    (SELECT COUNT(*)::INTEGER FROM transition_items WHERE profile_id = p_profile_id AND decision = 'parking_lot'),
    (SELECT COALESCE(SUM(estimated_value), 0) FROM transition_items WHERE profile_id = p_profile_id AND decision = 'sell'),
    (SELECT
      CASE WHEN COUNT(*) > 0
      THEN FLOOR(AVG(completion_percentage))::INTEGER
      ELSE 0 END
     FROM transition_rooms WHERE profile_id = p_profile_id);
END;
$$ LANGUAGE plpgsql;
