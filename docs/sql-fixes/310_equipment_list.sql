CREATE TABLE IF NOT EXISTS transition_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  template_item_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('recovery', 'kitchen', 'power', 'climate', 'safety', 'comfort')),
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('essential', 'nice-to-have')),
  estimated_cost DECIMAL(10,2),
  weight_lbs DECIMAL(10,2),
  space_requirement TEXT CHECK (space_requirement IN ('small', 'medium', 'large')),
  vendor_links JSONB DEFAULT '[]'::jsonb,
  community_tips TEXT,
  is_purchased BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_date DATE,
  actual_cost DECIMAL(10,2),
  purchase_location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equipment_profile ON transition_equipment(profile_id);
CREATE INDEX idx_equipment_category ON transition_equipment(profile_id, category);
CREATE INDEX idx_equipment_purchased ON transition_equipment(profile_id, is_purchased);

CREATE OR REPLACE FUNCTION get_equipment_stats(p_profile_id UUID)
RETURNS TABLE (
  total_items INTEGER,
  purchased_count INTEGER,
  essential_count INTEGER,
  nice_to_have_count INTEGER,
  total_estimated_cost DECIMAL(10,2),
  total_actual_cost DECIMAL(10,2),
  total_weight_lbs DECIMAL(10,2),
  purchase_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_items,
    COUNT(*) FILTER (WHERE is_purchased = true)::INTEGER as purchased_count,
    COUNT(*) FILTER (WHERE priority = 'essential')::INTEGER as essential_count,
    COUNT(*) FILTER (WHERE priority = 'nice-to-have')::INTEGER as nice_to_have_count,
    COALESCE(SUM(estimated_cost), 0)::DECIMAL(10,2) as total_estimated_cost,
    COALESCE(SUM(actual_cost), 0)::DECIMAL(10,2) as total_actual_cost,
    COALESCE(SUM(weight_lbs), 0)::DECIMAL(10,2) as total_weight_lbs,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE is_purchased = true)::DECIMAL / COUNT(*)::DECIMAL) * 100)::INTEGER
    END as purchase_percentage
  FROM transition_equipment
  WHERE profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql STABLE;
