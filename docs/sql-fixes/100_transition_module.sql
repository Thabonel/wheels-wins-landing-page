-- Migration: 100_transition_module.sql
-- Description: Life Transition Navigator - Database Schema
-- Created: January 2025
-- Purpose: Support users transitioning from traditional life to full-time RV living

-- ==================================================
-- TABLE 1: transition_profiles
-- ==================================================
-- Main transition plan for each user

CREATE TABLE transition_profiles (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core transition data
  departure_date DATE NOT NULL,
  current_phase TEXT NOT NULL DEFAULT 'planning'
    CHECK (current_phase IN ('planning', 'preparing', 'launching', 'on_road')),

  -- Profile details
  transition_type TEXT NOT NULL DEFAULT 'full_time'
    CHECK (transition_type IN ('full_time', 'part_time', 'seasonal', 'exploring')),
  motivation TEXT, -- Why they're doing this
  concerns JSONB DEFAULT '[]'::jsonb, -- Array of concerns/worries

  -- Settings
  is_enabled BOOLEAN DEFAULT true, -- Can be toggled off in user settings
  auto_hide_after_departure BOOLEAN DEFAULT true,
  hide_days_after_departure INTEGER DEFAULT 30,

  -- Progress tracking
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  last_milestone_reached TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ, -- When user archived/completed transition

  -- Constraints
  CONSTRAINT transition_profiles_future_departure
    CHECK (departure_date >= CURRENT_DATE OR archived_at IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_transition_profiles_user_id ON transition_profiles(user_id);
CREATE INDEX idx_transition_profiles_departure_date ON transition_profiles(departure_date);
CREATE INDEX idx_transition_profiles_is_enabled ON transition_profiles(is_enabled) WHERE is_enabled = true;

-- RLS Policies
ALTER TABLE transition_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transition profile"
ON transition_profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own transition profile"
ON transition_profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transition profile"
ON transition_profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own transition profile"
ON transition_profiles FOR DELETE
USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE transition_profiles IS 'Main transition plan for users transitioning to RV life';
COMMENT ON COLUMN transition_profiles.current_phase IS 'Current stage: planning (>3mo), preparing (1-3mo), launching (<1mo), on_road (departed)';
COMMENT ON COLUMN transition_profiles.auto_hide_after_departure IS 'Automatically hide module N days after departure';

-- ==================================================
-- TABLE 2: transition_tasks
-- ==================================================
-- Master checklist with system and custom tasks

CREATE TABLE transition_tasks (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL
    CHECK (category IN ('financial', 'vehicle', 'life', 'downsizing', 'equipment', 'legal', 'social', 'custom')),

  -- Task metadata
  is_system_task BOOLEAN DEFAULT false, -- System-generated vs user-created
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  estimated_hours DECIMAL(5, 2),

  -- Status
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES auth.users(id),

  -- Timeline
  suggested_start_date DATE, -- When to start this task
  suggested_completion_date DATE, -- Recommended completion date
  actual_completion_date DATE,

  -- Dependencies
  depends_on_task_ids UUID[], -- Array of task IDs that must be completed first
  blocks_task_ids UUID[], -- Tasks that can't start until this is done

  -- Milestone association
  milestone TEXT, -- Which timeline milestone this belongs to
  days_before_departure INTEGER, -- Suggested number of days before departure

  -- Attachments
  notes TEXT,
  resources JSONB DEFAULT '[]'::jsonb, -- Links, docs, etc.
  checklist_items JSONB DEFAULT '[]'::jsonb, -- Sub-tasks: [{text: "", completed: false}]

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT transition_tasks_completion_date_valid
    CHECK (completed_at IS NULL OR is_completed = true)
);

-- Indexes
CREATE INDEX idx_transition_tasks_profile_id ON transition_tasks(profile_id);
CREATE INDEX idx_transition_tasks_user_id ON transition_tasks(user_id);
CREATE INDEX idx_transition_tasks_category ON transition_tasks(category);
CREATE INDEX idx_transition_tasks_is_completed ON transition_tasks(is_completed);
CREATE INDEX idx_transition_tasks_priority ON transition_tasks(priority);
CREATE INDEX idx_transition_tasks_milestone ON transition_tasks(milestone);

-- RLS Policies
ALTER TABLE transition_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transition tasks"
ON transition_tasks FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own transition tasks"
ON transition_tasks FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transition tasks"
ON transition_tasks FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own transition tasks"
ON transition_tasks FOR DELETE
USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE transition_tasks IS 'Master checklist for transition tasks (system + custom)';
COMMENT ON COLUMN transition_tasks.is_system_task IS 'true = pre-populated by system, false = user-created';
COMMENT ON COLUMN transition_tasks.milestone IS 'Associated timeline milestone: planning, preparing, launching, departure, on_road';

-- ==================================================
-- TABLE 3: transition_timeline
-- ==================================================
-- Key milestone events in transition journey

CREATE TABLE transition_timeline (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Milestone details
  milestone_type TEXT NOT NULL
    CHECK (milestone_type IN ('planning_start', 'three_months', 'one_month', 'one_week', 'departure', 'first_night', 'one_month_road', 'custom')),
  milestone_name TEXT NOT NULL,
  milestone_date DATE NOT NULL,

  -- Status
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Milestone data
  description TEXT,
  celebration_message TEXT, -- Shown when milestone reached
  tasks_associated_count INTEGER DEFAULT 0, -- How many tasks linked to this

  -- Custom milestone fields
  is_system_milestone BOOLEAN DEFAULT true,
  custom_icon TEXT, -- For user-created milestones

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transition_timeline_profile_id ON transition_timeline(profile_id);
CREATE INDEX idx_transition_timeline_user_id ON transition_timeline(user_id);
CREATE INDEX idx_transition_timeline_milestone_date ON transition_timeline(milestone_date);
CREATE INDEX idx_transition_timeline_milestone_type ON transition_timeline(milestone_type);

-- RLS Policies
ALTER TABLE transition_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own timeline"
ON transition_timeline FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create timeline milestones"
ON transition_timeline FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own timeline"
ON transition_timeline FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own timeline milestones"
ON transition_timeline FOR DELETE
USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE transition_timeline IS 'Key milestone events in transition journey';
COMMENT ON COLUMN transition_timeline.milestone_type IS 'System milestones: planning_start, three_months, one_month, one_week, departure, etc.';

-- ==================================================
-- TABLE 4: transition_financial
-- ==================================================
-- Three-bucket financial planning system

CREATE TABLE transition_financial (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Bucket assignment
  bucket_type TEXT NOT NULL
    CHECK (bucket_type IN ('transition', 'emergency', 'travel')),

  -- Category within bucket
  category TEXT NOT NULL,
  subcategory TEXT,

  -- Financial details
  estimated_amount DECIMAL(10, 2) NOT NULL CHECK (estimated_amount >= 0),
  current_amount DECIMAL(10, 2) DEFAULT 0 CHECK (current_amount >= 0),

  -- Status
  is_funded BOOLEAN GENERATED ALWAYS AS (current_amount >= estimated_amount) STORED,
  funding_percentage INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN estimated_amount > 0 THEN LEAST(100, FLOOR((current_amount / estimated_amount) * 100))
      ELSE 0
    END
  ) STORED,

  -- Metadata
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  notes TEXT,
  due_date DATE, -- When this needs to be funded by

  -- Tracking
  last_contribution_date DATE,
  last_contribution_amount DECIMAL(10, 2),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transition_financial_profile_id ON transition_financial(profile_id);
CREATE INDEX idx_transition_financial_user_id ON transition_financial(user_id);
CREATE INDEX idx_transition_financial_bucket_type ON transition_financial(bucket_type);
CREATE INDEX idx_transition_financial_is_funded ON transition_financial(is_funded);

-- RLS Policies
ALTER TABLE transition_financial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own financial data"
ON transition_financial FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own financial entries"
ON transition_financial FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own financial entries"
ON transition_financial FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own financial entries"
ON transition_financial FOR DELETE
USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE transition_financial IS 'Three-bucket financial planning: transition costs, emergency fund, travel budget';
COMMENT ON COLUMN transition_financial.bucket_type IS 'transition = one-time costs, emergency = 6mo fund, travel = monthly budget';

-- ==================================================
-- TABLE 5: transition_inventory (For future use)
-- ==================================================
-- Room-by-room downsizing tracking

CREATE TABLE transition_inventory (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Room/location
  room_name TEXT NOT NULL,
  room_type TEXT CHECK (room_type IN ('bedroom', 'kitchen', 'living', 'garage', 'storage', 'office', 'other')),

  -- Item details
  item_name TEXT NOT NULL,
  item_category TEXT,
  quantity INTEGER DEFAULT 1,

  -- Decision
  decision TEXT
    CHECK (decision IN ('keep', 'sell', 'donate', 'gift', 'trash', 'undecided')),
  decision_notes TEXT,

  -- If selling
  estimated_value DECIMAL(10, 2),
  sold_price DECIMAL(10, 2),
  sold_date DATE,
  buyer_info TEXT,

  -- Status
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,

  -- Images
  images TEXT[], -- URLs to photos

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transition_inventory_profile_id ON transition_inventory(profile_id);
CREATE INDEX idx_transition_inventory_user_id ON transition_inventory(user_id);
CREATE INDEX idx_transition_inventory_room_name ON transition_inventory(room_name);
CREATE INDEX idx_transition_inventory_decision ON transition_inventory(decision);

-- RLS Policies
ALTER TABLE transition_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own inventory"
ON transition_inventory FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Comments
COMMENT ON TABLE transition_inventory IS 'Room-by-room inventory for downsizing (keep/sell/donate)';

-- ==================================================
-- TABLE 6: transition_equipment (For future use)
-- ==================================================
-- Equipment acquisition tracking

CREATE TABLE transition_equipment (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Equipment details
  equipment_name TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('solar', 'water', 'electrical', 'safety', 'comfort', 'communication', 'tools', 'other')),

  -- Purchase planning
  is_needed BOOLEAN DEFAULT true,
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Financial
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  budget_bucket TEXT DEFAULT 'transition'
    CHECK (budget_bucket IN ('transition', 'emergency', 'travel')),

  -- Status
  acquisition_status TEXT DEFAULT 'researching'
    CHECK (acquisition_status IN ('researching', 'budgeted', 'ordered', 'acquired', 'installed', 'not_needed')),
  acquired_date DATE,

  -- Research
  research_notes TEXT,
  product_links JSONB DEFAULT '[]'::jsonb,
  installation_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transition_equipment_profile_id ON transition_equipment(profile_id);
CREATE INDEX idx_transition_equipment_user_id ON transition_equipment(user_id);
CREATE INDEX idx_transition_equipment_category ON transition_equipment(category);
CREATE INDEX idx_transition_equipment_status ON transition_equipment(acquisition_status);

-- RLS Policies
ALTER TABLE transition_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own equipment list"
ON transition_equipment FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Comments
COMMENT ON TABLE transition_equipment IS 'Equipment acquisition tracking (solar, water systems, etc.)';

-- ==================================================
-- TABLE 7: transition_vehicles (For future use)
-- ==================================================
-- Vehicle modification and setup tracking

CREATE TABLE transition_vehicles (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vehicle details
  vehicle_type TEXT NOT NULL
    CHECK (vehicle_type IN ('rv', 'van', 'truck_camper', 'trailer', 'tow_vehicle', 'other')),
  make TEXT,
  model TEXT,
  year INTEGER,
  is_primary_vehicle BOOLEAN DEFAULT true,

  -- Acquisition
  acquisition_status TEXT DEFAULT 'searching'
    CHECK (acquisition_status IN ('searching', 'found', 'purchasing', 'owned')),
  acquisition_date DATE,
  purchase_price DECIMAL(10, 2),

  -- Modifications
  modifications JSONB DEFAULT '[]'::jsonb,
  -- [{name: "", status: "planned|in_progress|completed", cost: 0, notes: ""}]

  total_modification_cost DECIMAL(10, 2) DEFAULT 0,

  -- Status
  is_road_ready BOOLEAN DEFAULT false,
  ready_date DATE,

  -- Notes
  notes TEXT,
  images TEXT[],

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transition_vehicles_profile_id ON transition_vehicles(profile_id);
CREATE INDEX idx_transition_vehicles_user_id ON transition_vehicles(user_id);
CREATE INDEX idx_transition_vehicles_type ON transition_vehicles(vehicle_type);
CREATE INDEX idx_transition_vehicles_status ON transition_vehicles(acquisition_status);

-- RLS Policies
ALTER TABLE transition_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vehicles"
ON transition_vehicles FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Comments
COMMENT ON TABLE transition_vehicles IS 'Vehicle acquisition and modification tracking';

-- ==================================================
-- TABLE 8: transition_community (For future use)
-- ==================================================
-- Buddy connections and mentorship

CREATE TABLE transition_community (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buddy_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Connection type
  connection_type TEXT NOT NULL
    CHECK (connection_type IN ('mentor', 'buddy', 'meetup', 'group')),

  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),

  -- Matching data
  match_score INTEGER, -- 0-100 based on preferences
  shared_interests JSONB DEFAULT '[]'::jsonb,
  shared_timeline BOOLEAN DEFAULT false, -- Similar departure dates

  -- Communication
  last_contact_date DATE,
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transition_community_user_id ON transition_community(user_id);
CREATE INDEX idx_transition_community_buddy_id ON transition_community(buddy_user_id);
CREATE INDEX idx_transition_community_status ON transition_community(status);

-- RLS Policies
ALTER TABLE transition_community ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
ON transition_community FOR SELECT
USING (user_id = auth.uid() OR buddy_user_id = auth.uid());

CREATE POLICY "Users can create connections"
ON transition_community FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their connections"
ON transition_community FOR UPDATE
USING (user_id = auth.uid() OR buddy_user_id = auth.uid())
WITH CHECK (user_id = auth.uid() OR buddy_user_id = auth.uid());

-- Comments
COMMENT ON TABLE transition_community IS 'Buddy connections and mentorship for transition support';

-- ==================================================
-- FUNCTIONS
-- ==================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_transition_profiles_updated_at
  BEFORE UPDATE ON transition_profiles
  FOR EACH ROW EXECUTE FUNCTION update_transition_updated_at();

CREATE TRIGGER update_transition_tasks_updated_at
  BEFORE UPDATE ON transition_tasks
  FOR EACH ROW EXECUTE FUNCTION update_transition_updated_at();

CREATE TRIGGER update_transition_timeline_updated_at
  BEFORE UPDATE ON transition_timeline
  FOR EACH ROW EXECUTE FUNCTION update_transition_updated_at();

CREATE TRIGGER update_transition_financial_updated_at
  BEFORE UPDATE ON transition_financial
  FOR EACH ROW EXECUTE FUNCTION update_transition_updated_at();

CREATE TRIGGER update_transition_inventory_updated_at
  BEFORE UPDATE ON transition_inventory
  FOR EACH ROW EXECUTE FUNCTION update_transition_updated_at();

CREATE TRIGGER update_transition_equipment_updated_at
  BEFORE UPDATE ON transition_equipment
  FOR EACH ROW EXECUTE FUNCTION update_transition_updated_at();

CREATE TRIGGER update_transition_vehicles_updated_at
  BEFORE UPDATE ON transition_vehicles
  FOR EACH ROW EXECUTE FUNCTION update_transition_updated_at();

-- Function to calculate completion percentage
CREATE OR REPLACE FUNCTION calculate_transition_completion(p_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  percentage INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tasks
  FROM transition_tasks
  WHERE profile_id = p_profile_id;

  IF total_tasks = 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO completed_tasks
  FROM transition_tasks
  WHERE profile_id = p_profile_id AND is_completed = true;

  percentage := FLOOR((completed_tasks::DECIMAL / total_tasks::DECIMAL) * 100);

  RETURN percentage;
END;
$$ LANGUAGE plpgsql;

-- Function to update profile completion percentage when tasks change
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE transition_profiles
  SET completion_percentage = calculate_transition_completion(NEW.profile_id)
  WHERE id = NEW.profile_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update completion percentage
CREATE TRIGGER update_completion_on_task_change
  AFTER INSERT OR UPDATE OR DELETE ON transition_tasks
  FOR EACH ROW EXECUTE FUNCTION update_profile_completion();

-- Function to determine current phase based on departure date
CREATE OR REPLACE FUNCTION determine_transition_phase(p_departure_date DATE)
RETURNS TEXT AS $$
DECLARE
  days_until_departure INTEGER;
BEGIN
  days_until_departure := p_departure_date - CURRENT_DATE;

  IF days_until_departure < 0 THEN
    RETURN 'on_road';
  ELSIF days_until_departure <= 7 THEN
    RETURN 'launching';
  ELSIF days_until_departure <= 90 THEN
    RETURN 'preparing';
  ELSE
    RETURN 'planning';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update phase when departure date changes
CREATE OR REPLACE FUNCTION update_transition_phase()
RETURNS TRIGGER AS $$
BEGIN
  NEW.current_phase := determine_transition_phase(NEW.departure_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update phase
CREATE TRIGGER auto_update_transition_phase
  BEFORE INSERT OR UPDATE OF departure_date ON transition_profiles
  FOR EACH ROW EXECUTE FUNCTION update_transition_phase();

-- ==================================================
-- SEED DATA (System Tasks Template)
-- ==================================================

-- Function to create default tasks for new transition profiles
CREATE OR REPLACE FUNCTION create_default_transition_tasks(p_profile_id UUID, p_user_id UUID, p_departure_date DATE)
RETURNS VOID AS $$
BEGIN
  -- FINANCIAL TASKS
  INSERT INTO transition_tasks (profile_id, user_id, title, description, category, is_system_task, priority, milestone, days_before_departure) VALUES
  (p_profile_id, p_user_id, 'Create transition budget', 'Calculate all one-time transition costs', 'financial', true, 'critical', 'planning_start', 365),
  (p_profile_id, p_user_id, 'Build 6-month emergency fund', 'Save enough to cover 6 months of expenses', 'financial', true, 'critical', 'three_months', 90),
  (p_profile_id, p_user_id, 'Set monthly travel budget', 'Determine sustainable monthly spending', 'financial', true, 'high', 'three_months', 90),
  (p_profile_id, p_user_id, 'Review insurance options', 'Research RV, health, and liability insurance', 'financial', true, 'high', 'one_month', 30);

  -- VEHICLE TASKS
  INSERT INTO transition_tasks (profile_id, user_id, title, description, category, is_system_task, priority, milestone, days_before_departure) VALUES
  (p_profile_id, p_user_id, 'Choose vehicle type', 'Decide on RV, van, truck camper, or trailer', 'vehicle', true, 'critical', 'planning_start', 365),
  (p_profile_id, p_user_id, 'Purchase/acquire vehicle', 'Buy or lease your RV/van', 'vehicle', true, 'critical', 'three_months', 90),
  (p_profile_id, p_user_id, 'Complete vehicle modifications', 'Solar, water, electrical systems', 'vehicle', true, 'high', 'one_month', 30),
  (p_profile_id, p_user_id, 'Full mechanical inspection', 'Get professional safety inspection', 'vehicle', true, 'critical', 'one_week', 7);

  -- LIFE TASKS
  INSERT INTO transition_tasks (profile_id, user_id, title, description, category, is_system_task, priority, milestone, days_before_departure) VALUES
  (p_profile_id, p_user_id, 'Downsize belongings', 'Sell, donate, or store possessions', 'life', true, 'high', 'three_months', 90),
  (p_profile_id, p_user_id, 'Establish mail forwarding', 'Set up mail service (Escapees, etc)', 'life', true, 'high', 'one_month', 30),
  (p_profile_id, p_user_id, 'Update legal documents', 'Wills, power of attorney, medical directives', 'legal', true, 'medium', 'one_month', 30),
  (p_profile_id, p_user_id, 'Change address/domicile', 'Establish legal residence state', 'legal', true, 'high', 'one_month', 30),
  (p_profile_id, p_user_id, 'Cancel/transfer utilities', 'End home services or transfer', 'life', true, 'medium', 'one_week', 7);

  -- EQUIPMENT TASKS
  INSERT INTO transition_tasks (profile_id, user_id, title, description, category, is_system_task, priority, milestone, days_before_departure) VALUES
  (p_profile_id, p_user_id, 'Create equipment checklist', 'List all needed RV equipment', 'equipment', true, 'high', 'three_months', 90),
  (p_profile_id, p_user_id, 'Acquire essential equipment', 'Purchase must-have items', 'equipment', true, 'high', 'one_month', 30),
  (p_profile_id, p_user_id, 'Test all systems', 'Verify solar, water, electrical work', 'equipment', true, 'critical', 'one_week', 7);

  -- SOCIAL TASKS
  INSERT INTO transition_tasks (profile_id, user_id, title, description, category, is_system_task, priority, milestone, days_before_departure) VALUES
  (p_profile_id, p_user_id, 'Tell family and friends', 'Share your plans with loved ones', 'social', true, 'medium', 'three_months', 90),
  (p_profile_id, p_user_id, 'Join RV communities', 'Connect with other RVers online', 'social', true, 'medium', 'three_months', 90),
  (p_profile_id, p_user_id, 'Plan goodbye gatherings', 'Organize farewell events', 'social', true, 'low', 'one_month', 30);
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- VALIDATION
-- ==================================================

DO $$
BEGIN
  -- Verify all tables were created
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transition_profiles') THEN
    RAISE EXCEPTION 'Migration failed: transition_profiles table was not created';
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transition_tasks') THEN
    RAISE EXCEPTION 'Migration failed: transition_tasks table was not created';
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transition_timeline') THEN
    RAISE EXCEPTION 'Migration failed: transition_timeline table was not created';
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transition_financial') THEN
    RAISE EXCEPTION 'Migration failed: transition_financial table was not created';
  END IF;

  RAISE NOTICE 'Migration 100_transition_module.sql completed successfully';
END $$;

-- ==================================================
-- MIGRATION COMPLETE
-- ==================================================
