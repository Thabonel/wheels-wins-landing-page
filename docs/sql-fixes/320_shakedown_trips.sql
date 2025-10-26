CREATE TABLE IF NOT EXISTS shakedown_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  distance_miles DECIMAL(10,2),
  trip_type TEXT NOT NULL CHECK (trip_type IN ('weekend', 'week', 'extended')),
  start_date DATE NOT NULL,
  end_date DATE,
  confidence_rating INTEGER CHECK (confidence_rating >= 1 AND confidence_rating <= 10),
  lessons_learned TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shakedown_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES shakedown_trips(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('power', 'water', 'comfort', 'storage', 'driving')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  description TEXT NOT NULL,
  solution_found TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  parts_needed TEXT,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  resolved_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shakedown_trips_profile ON shakedown_trips(profile_id);
CREATE INDEX idx_shakedown_trips_date ON shakedown_trips(profile_id, start_date DESC);
CREATE INDEX idx_shakedown_issues_trip ON shakedown_issues(trip_id);
CREATE INDEX idx_shakedown_issues_profile ON shakedown_issues(profile_id);
CREATE INDEX idx_shakedown_issues_resolved ON shakedown_issues(profile_id, is_resolved);
CREATE INDEX idx_shakedown_issues_severity ON shakedown_issues(profile_id, severity);

CREATE OR REPLACE FUNCTION get_shakedown_stats(p_profile_id UUID)
RETURNS TABLE (
  total_trips INTEGER,
  total_days INTEGER,
  total_distance DECIMAL(10,2),
  total_issues INTEGER,
  resolved_issues INTEGER,
  pending_issues INTEGER,
  critical_issues INTEGER,
  avg_confidence DECIMAL(3,1),
  latest_confidence INTEGER,
  confidence_trend TEXT
) AS $$
DECLARE
  prev_confidence INTEGER;
  curr_confidence INTEGER;
BEGIN
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(duration_days), 0)::INTEGER,
    COALESCE(SUM(distance_miles), 0)::DECIMAL(10,2),
    (SELECT COUNT(*)::INTEGER FROM shakedown_issues WHERE profile_id = p_profile_id),
    (SELECT COUNT(*)::INTEGER FROM shakedown_issues WHERE profile_id = p_profile_id AND is_resolved = true),
    (SELECT COUNT(*)::INTEGER FROM shakedown_issues WHERE profile_id = p_profile_id AND is_resolved = false),
    (SELECT COUNT(*)::INTEGER FROM shakedown_issues WHERE profile_id = p_profile_id AND severity = 'critical' AND is_resolved = false),
    COALESCE(AVG(confidence_rating), 0)::DECIMAL(3,1),
    (SELECT confidence_rating FROM shakedown_trips WHERE profile_id = p_profile_id ORDER BY start_date DESC LIMIT 1)
  INTO total_trips, total_days, total_distance, total_issues, resolved_issues, pending_issues, critical_issues, avg_confidence, curr_confidence
  FROM shakedown_trips
  WHERE profile_id = p_profile_id;

  SELECT confidence_rating INTO prev_confidence
  FROM shakedown_trips
  WHERE profile_id = p_profile_id
  ORDER BY start_date DESC
  OFFSET 1 LIMIT 1;

  IF prev_confidence IS NULL THEN
    confidence_trend := 'stable';
  ELSIF curr_confidence > prev_confidence THEN
    confidence_trend := 'improving';
  ELSIF curr_confidence < prev_confidence THEN
    confidence_trend := 'declining';
  ELSE
    confidence_trend := 'stable';
  END IF;

  latest_confidence := COALESCE(curr_confidence, 0);

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE;
