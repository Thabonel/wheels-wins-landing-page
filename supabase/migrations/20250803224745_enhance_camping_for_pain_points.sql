-- Migration: Enhance camping locations for pain point solutions
-- Date: 2025-08-03
-- Purpose: Add support for free camping, crowd-sourcing, and pain point mitigation

-- 1. Enhance existing camping_locations table
ALTER TABLE camping_locations 
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS last_scraped TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS crowd_level TEXT CHECK (crowd_level IN ('low', 'medium', 'high', NULL)),
ADD COLUMN IF NOT EXISTS last_crowd_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS alternative_sites JSONB;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_camping_locations_is_free ON camping_locations(is_free) WHERE is_free = true;
CREATE INDEX IF NOT EXISTS idx_camping_locations_crowd_level ON camping_locations(crowd_level) WHERE crowd_level IS NOT NULL;

-- Add comments
COMMENT ON COLUMN camping_locations.is_free IS 'Whether this is a free camping location';
COMMENT ON COLUMN camping_locations.source_url IS 'URL where this camping data was sourced from';
COMMENT ON COLUMN camping_locations.last_scraped IS 'When this data was last updated via web scraping';
COMMENT ON COLUMN camping_locations.crowd_level IS 'Current crowding level based on user reports';
COMMENT ON COLUMN camping_locations.last_crowd_update IS 'When crowd level was last updated';
COMMENT ON COLUMN camping_locations.alternative_sites IS 'JSON array of nearby alternative camping location IDs';

-- 2. Create regional pain points table
CREATE TABLE IF NOT EXISTS regional_pain_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  country TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('cost', 'overcrowding', 'availability', 'regulations', 'weather')),
  description TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  season TEXT,
  mitigation_tips JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_regional_pain_points_region ON regional_pain_points(region, country);
CREATE INDEX idx_regional_pain_points_type ON regional_pain_points(challenge_type);

-- 3. Create crowd-sourced camping updates table
CREATE TABLE IF NOT EXISTS camping_site_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camping_location_id UUID REFERENCES camping_locations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  crowd_level TEXT CHECK (crowd_level IN ('low', 'medium', 'high')),
  availability_status TEXT CHECK (availability_status IN ('available', 'full', 'closed', 'unknown')),
  conditions TEXT,
  photos TEXT[],
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_camping_updates_location ON camping_site_updates(camping_location_id);
CREATE INDEX idx_camping_updates_created ON camping_site_updates(created_at DESC);

-- 4. Create user budget preferences table
CREATE TABLE IF NOT EXISTS user_budget_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_camping_budget DECIMAL(10,2),
  alert_threshold DECIMAL(3,2) DEFAULT 0.8 CHECK (alert_threshold BETWEEN 0 AND 1),
  preferred_amenities JSONB,
  avoid_paid_camping BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create view for latest camping updates
CREATE OR REPLACE VIEW latest_camping_updates AS
SELECT DISTINCT ON (camping_location_id) 
  camping_location_id,
  crowd_level,
  availability_status,
  conditions,
  created_at
FROM camping_site_updates
ORDER BY camping_location_id, created_at DESC;

-- 6. Insert initial regional pain points data
INSERT INTO regional_pain_points (region, country, challenge_type, description, severity, season, mitigation_tips) VALUES
-- Australia
('New South Wales', 'Australia', 'cost', 'Rising camping fees due to standardization proposals', 'high', 'all', 
 '{"tips": ["Look for free rest areas", "Use WikiCamps to find council-run free camps", "Consider membership discounts"]}'),
('Queensland', 'Australia', 'overcrowding', 'Popular coastal camps book out during school holidays', 'high', 'school_holidays',
 '{"tips": ["Book 3+ months ahead", "Consider inland alternatives", "Travel midweek"]}'),
('Victoria', 'Australia', 'availability', 'Limited free camping due to regulations', 'medium', 'all',
 '{"tips": ["Focus on state forests", "Look for showgrounds", "Check local council websites"]}'),

-- United States
('California', 'USA', 'overcrowding', 'National park campgrounds full year-round', 'high', 'summer',
 '{"tips": ["Use recreation.gov cancellation alerts", "Consider dispersed camping on BLM land", "Book 6 months ahead"]}'),
('Arizona', 'USA', 'weather', 'Extreme heat makes summer camping dangerous', 'high', 'summer',
 '{"tips": ["Camp at higher elevations", "Plan for early morning travel", "Ensure adequate water storage"]}'),
('Florida', 'USA', 'cost', 'High demand drives up private campground prices', 'medium', 'winter',
 '{"tips": ["Use state park annual passes", "Consider Harvest Hosts", "Look for county parks"]}')
ON CONFLICT DO NOTHING;

-- 7. Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_regional_pain_points_updated_at BEFORE UPDATE ON regional_pain_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_budget_preferences_updated_at BEFORE UPDATE ON user_budget_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Row Level Security
ALTER TABLE regional_pain_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE camping_site_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_budget_preferences ENABLE ROW LEVEL SECURITY;

-- Everyone can read pain points
CREATE POLICY "regional_pain_points_read_all" ON regional_pain_points
    FOR SELECT USING (true);

-- Only admins can modify pain points
CREATE POLICY "regional_pain_points_admin_write" ON regional_pain_points
    FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Anyone can read camping updates
CREATE POLICY "camping_updates_read_all" ON camping_site_updates
    FOR SELECT USING (true);

-- Authenticated users can create updates
CREATE POLICY "camping_updates_create_auth" ON camping_site_updates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own updates
CREATE POLICY "camping_updates_update_own" ON camping_site_updates
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only access their own budget preferences
CREATE POLICY "budget_preferences_own" ON user_budget_preferences
    FOR ALL USING (auth.uid() = user_id);