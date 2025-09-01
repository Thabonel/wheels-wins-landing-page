-- Migration: Create tables for data collector state tracking and metrics (FIXED)
-- Purpose: Support robust, database-driven data collection for 5000+ trips

-- Track collector state and progress
CREATE TABLE IF NOT EXISTS data_collector_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  last_run TIMESTAMP,
  total_collected INTEGER DEFAULT 0,
  next_priority TEXT,
  active_sources JSONB DEFAULT '[]'::jsonb,
  collection_config JSONB DEFAULT '{}'::jsonb,
  error_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Performance metrics for monitoring
CREATE TABLE IF NOT EXISTS data_collector_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID,
  run_date TIMESTAMP WITH TIME ZONE NOT NULL,
  source TEXT NOT NULL,
  items_collected INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  duration_seconds FLOAT,
  error_messages JSONB DEFAULT '[]'::jsonb,
  quality_scores JSONB DEFAULT '[]'::jsonb,
  api_calls_made INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Deduplicated location master table (FIXED: removed generated column)
CREATE TABLE IF NOT EXISTS trip_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  location_hash TEXT UNIQUE,
  country TEXT,
  state_province TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMP WITH TIME ZONE,
  verification_source TEXT,
  data_sources JSONB DEFAULT '[]'::jsonb,
  quality_score FLOAT DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Collection runs history
CREATE TABLE IF NOT EXISTS data_collector_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_type TEXT NOT NULL, -- 'scheduled', 'manual', 'recovery'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  target_count INTEGER,
  actual_count INTEGER DEFAULT 0,
  sources_attempted JSONB DEFAULT '[]'::jsonb,
  sources_succeeded JSONB DEFAULT '[]'::jsonb,
  error_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Source configuration for data collection
CREATE TABLE IF NOT EXISTS data_collector_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL, -- 'api', 'scraper', 'rss'
  url TEXT,
  api_key_name TEXT, -- Name of env variable containing API key
  rate_limit INTEGER DEFAULT 60, -- Requests per hour
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important
  is_active BOOLEAN DEFAULT true,
  last_collected_at TIMESTAMP WITH TIME ZONE,
  total_collected INTEGER DEFAULT 0,
  average_quality_score FLOAT DEFAULT 0.0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_locations_country ON trip_locations(country);
CREATE INDEX IF NOT EXISTS idx_trip_locations_verified ON trip_locations(verified);
CREATE INDEX IF NOT EXISTS idx_trip_locations_quality ON trip_locations(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_trip_locations_coords ON trip_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_trip_locations_hash ON trip_locations(location_hash);

CREATE INDEX IF NOT EXISTS idx_collector_metrics_run_date ON data_collector_metrics(run_date DESC);
CREATE INDEX IF NOT EXISTS idx_collector_metrics_source ON data_collector_metrics(source);

CREATE INDEX IF NOT EXISTS idx_collector_runs_status ON data_collector_runs(status);
CREATE INDEX IF NOT EXISTS idx_collector_runs_started ON data_collector_runs(started_at DESC);

-- Function to generate location hash (called from application)
CREATE OR REPLACE FUNCTION generate_location_hash(lat DECIMAL, lng DECIMAL)
RETURNS TEXT AS $$
BEGIN
  RETURN MD5(ROUND(lat, 4)::text || ',' || ROUND(lng, 4)::text);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Insert default collector state
INSERT INTO data_collector_state (
  next_priority,
  active_sources,
  collection_config
) VALUES (
  'camping',
  '["recreation_gov", "openstreetmap", "ioverlander"]'::jsonb,
  '{
    "target_per_run": 500,
    "run_frequency": "weekly",
    "enable_ai_enhancement": false,
    "enable_deduplication": true,
    "quality_threshold": 0.3
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Insert default source configurations
INSERT INTO data_collector_sources (name, source_type, url, api_key_name, rate_limit, priority) VALUES
  ('recreation_gov', 'api', 'https://ridb.recreation.gov/api/v1/facilities', 'RECREATION_GOV_KEY', 60, 9),
  ('openstreetmap', 'api', 'https://overpass-api.de/api/interpreter', NULL, 30, 8),
  ('ioverlander', 'api', 'https://ioverlander.com/api/v1/places', NULL, 60, 7),
  ('freecampsites', 'scraper', 'https://freecampsites.net', NULL, 30, 6),
  ('nps_api', 'api', 'https://developer.nps.gov/api/v1', 'NPS_API_KEY', 60, 8),
  ('google_places', 'api', 'https://maps.googleapis.com/maps/api/place', 'GOOGLE_PLACES_KEY', 100, 5)
ON CONFLICT (name) DO NOTHING;

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_data_collector_state_updated_at') THEN
    CREATE TRIGGER update_data_collector_state_updated_at
      BEFORE UPDATE ON data_collector_state
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_trip_locations_updated_at') THEN
    CREATE TRIGGER update_trip_locations_updated_at
      BEFORE UPDATE ON trip_locations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_data_collector_sources_updated_at') THEN
    CREATE TRIGGER update_data_collector_sources_updated_at
      BEFORE UPDATE ON data_collector_sources
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON data_collector_state TO authenticated;
GRANT SELECT, INSERT ON data_collector_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON trip_locations TO authenticated;
GRANT SELECT, INSERT ON data_collector_runs TO authenticated;
GRANT SELECT ON data_collector_sources TO authenticated;

-- Add RLS policies (assuming service role for backend operations)
ALTER TABLE data_collector_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_collector_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_collector_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_collector_sources ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to collector state"
  ON data_collector_state FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to collector metrics"
  ON data_collector_metrics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to trip locations"
  ON trip_locations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to collector runs"
  ON data_collector_runs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to collector sources"
  ON data_collector_sources FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Authenticated users can read trip locations
CREATE POLICY "Authenticated users can read trip locations"
  ON trip_locations FOR SELECT
  USING (auth.role() = 'authenticated');