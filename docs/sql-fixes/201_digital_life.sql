-- ============================================================================
-- Digital Life Consolidation System
-- Part of Life Transition Navigator - Stage 2
-- ============================================================================

-- Table for tracking services to cancel, consolidate, or digitize
CREATE TABLE IF NOT EXISTS transition_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  service_type TEXT NOT NULL
    CHECK (service_type IN ('cancellation', 'consolidation', 'digitization')),

  -- Service details
  service_name TEXT NOT NULL,
  category TEXT NOT NULL,
  provider TEXT,
  account_number TEXT,

  -- Cancellation fields
  cancellation_target_date DATE,
  cancellation_completed BOOLEAN DEFAULT FALSE,
  cancellation_completed_date DATE,

  -- Consolidation fields
  old_account_info TEXT,
  new_account_info TEXT,
  consolidation_status TEXT
    CHECK (consolidation_status IN ('pending', 'in_progress', 'completed', NULL)),

  -- Digitization fields
  documents_total INTEGER DEFAULT 0,
  documents_scanned INTEGER DEFAULT 0,
  storage_location TEXT,

  -- Common fields
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transition_services_profile ON transition_services(profile_id);
CREATE INDEX IF NOT EXISTS idx_transition_services_user ON transition_services(user_id);
CREATE INDEX IF NOT EXISTS idx_transition_services_type ON transition_services(service_type);
CREATE INDEX IF NOT EXISTS idx_transition_services_status ON transition_services(status);

-- Enable RLS
ALTER TABLE transition_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY transition_services_user_isolation ON transition_services
  FOR ALL USING (auth.uid() = user_id);

-- Function to populate common services for new profile
CREATE OR REPLACE FUNCTION create_default_services(
  p_profile_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Common cancellation services
  INSERT INTO transition_services (profile_id, user_id, service_type, service_name, category, priority)
  VALUES
    -- Utilities
    (p_profile_id, p_user_id, 'cancellation', 'Electric Service', 'Utilities', 'high'),
    (p_profile_id, p_user_id, 'cancellation', 'Gas Service', 'Utilities', 'high'),
    (p_profile_id, p_user_id, 'cancellation', 'Water Service', 'Utilities', 'high'),
    (p_profile_id, p_user_id, 'cancellation', 'Internet/Cable', 'Utilities', 'high'),
    (p_profile_id, p_user_id, 'cancellation', 'Trash Service', 'Utilities', 'medium'),

    -- Subscriptions
    (p_profile_id, p_user_id, 'cancellation', 'Gym Membership', 'Subscriptions', 'medium'),
    (p_profile_id, p_user_id, 'cancellation', 'Lawn Service', 'Subscriptions', 'low'),
    (p_profile_id, p_user_id, 'cancellation', 'Streaming Services', 'Subscriptions', 'low'),

    -- Mail
    (p_profile_id, p_user_id, 'cancellation', 'Magazine Subscriptions', 'Mail', 'low'),
    (p_profile_id, p_user_id, 'cancellation', 'Newspaper Delivery', 'Mail', 'low');

  -- Common consolidation services
  INSERT INTO transition_services (profile_id, user_id, service_type, service_name, category, priority, consolidation_status)
  VALUES
    (p_profile_id, p_user_id, 'consolidation', 'Bank Accounts', 'Banking', 'high', 'pending'),
    (p_profile_id, p_user_id, 'consolidation', 'Credit Cards', 'Banking', 'medium', 'pending'),
    (p_profile_id, p_user_id, 'consolidation', 'Health Insurance', 'Insurance', 'critical', 'pending'),
    (p_profile_id, p_user_id, 'consolidation', 'Auto Insurance', 'Insurance', 'high', 'pending'),
    (p_profile_id, p_user_id, 'consolidation', 'Home Insurance', 'Insurance', 'high', 'pending'),
    (p_profile_id, p_user_id, 'consolidation', 'Investment Accounts', 'Banking', 'medium', 'pending');

  -- Common digitization categories
  INSERT INTO transition_services (profile_id, user_id, service_type, service_name, category, priority)
  VALUES
    (p_profile_id, p_user_id, 'digitization', 'Tax Documents', 'Legal/Financial', 'high'),
    (p_profile_id, p_user_id, 'digitization', 'Insurance Policies', 'Legal/Financial', 'high'),
    (p_profile_id, p_user_id, 'digitization', 'Medical Records', 'Health', 'high'),
    (p_profile_id, p_user_id, 'digitization', 'Vehicle Documents', 'Legal/Financial', 'high'),
    (p_profile_id, p_user_id, 'digitization', 'Property Deeds', 'Legal/Financial', 'medium'),
    (p_profile_id, p_user_id, 'digitization', 'Birth Certificates', 'Legal/Financial', 'critical'),
    (p_profile_id, p_user_id, 'digitization', 'Passports', 'Legal/Financial', 'critical'),
    (p_profile_id, p_user_id, 'digitization', 'Family Photos', 'Personal', 'medium'),
    (p_profile_id, p_user_id, 'digitization', 'Important Correspondence', 'Personal', 'low');
END;
$$ LANGUAGE plpgsql;

-- Function to get service summary statistics
CREATE OR REPLACE FUNCTION get_service_stats(p_profile_id UUID)
RETURNS TABLE(
  total_cancellations INTEGER,
  completed_cancellations INTEGER,
  pending_cancellations INTEGER,
  total_consolidations INTEGER,
  completed_consolidations INTEGER,
  pending_consolidations INTEGER,
  total_digitizations INTEGER,
  documents_scanned INTEGER,
  documents_total INTEGER,
  digitization_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM transition_services WHERE profile_id = p_profile_id AND service_type = 'cancellation'),
    (SELECT COUNT(*)::INTEGER FROM transition_services WHERE profile_id = p_profile_id AND service_type = 'cancellation' AND cancellation_completed = TRUE),
    (SELECT COUNT(*)::INTEGER FROM transition_services WHERE profile_id = p_profile_id AND service_type = 'cancellation' AND cancellation_completed = FALSE),
    (SELECT COUNT(*)::INTEGER FROM transition_services WHERE profile_id = p_profile_id AND service_type = 'consolidation'),
    (SELECT COUNT(*)::INTEGER FROM transition_services WHERE profile_id = p_profile_id AND service_type = 'consolidation' AND consolidation_status = 'completed'),
    (SELECT COUNT(*)::INTEGER FROM transition_services WHERE profile_id = p_profile_id AND service_type = 'consolidation' AND consolidation_status IN ('pending', 'in_progress')),
    (SELECT COUNT(*)::INTEGER FROM transition_services WHERE profile_id = p_profile_id AND service_type = 'digitization'),
    (SELECT COALESCE(SUM(documents_scanned), 0)::INTEGER FROM transition_services WHERE profile_id = p_profile_id AND service_type = 'digitization'),
    (SELECT COALESCE(SUM(documents_total), 0)::INTEGER FROM transition_services WHERE profile_id = p_profile_id AND service_type = 'digitization'),
    (SELECT
      CASE WHEN COALESCE(SUM(documents_total), 0) > 0
      THEN FLOOR((COALESCE(SUM(documents_scanned), 0)::DECIMAL / COALESCE(SUM(documents_total), 1)::DECIMAL) * 100)::INTEGER
      ELSE 0 END
     FROM transition_services WHERE profile_id = p_profile_id AND service_type = 'digitization');
END;
$$ LANGUAGE plpgsql;
