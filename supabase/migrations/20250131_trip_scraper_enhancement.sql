-- Trip Scraper Enhancement Migration
-- Created: 2025-01-31
-- Adds new tables for improved trip scraping functionality

-- Table for managing scraping sources
CREATE TABLE IF NOT EXISTS trip_scraper_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('api', 'scraper', 'rss', 'manual')),
  is_active BOOLEAN DEFAULT true,
  rate_limit INTEGER DEFAULT 60, -- requests per hour
  selectors JSONB DEFAULT '{}', -- CSS selectors for scraping
  api_config JSONB DEFAULT '{}', -- API configuration
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for detailed scraping results
CREATE TABLE IF NOT EXISTS trip_scraper_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES trip_scraper_jobs(id) ON DELETE CASCADE,
  source_id UUID REFERENCES trip_scraper_sources(id),
  raw_data JSONB,
  processed_data JSONB,
  template_data JSONB,
  images_found TEXT[],
  quality_score DECIMAL(3,2),
  ai_enhanced BOOLEAN DEFAULT false,
  import_status TEXT CHECK (import_status IN ('pending', 'preview', 'imported', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for AI model configuration
CREATE TABLE IF NOT EXISTS scraper_ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'openai',
  model_name TEXT NOT NULL,
  model_version TEXT,
  max_tokens INTEGER DEFAULT 2000,
  temperature DECIMAL(2,1) DEFAULT 0.7,
  is_active BOOLEAN DEFAULT true,
  config_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE trip_scraper_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_scraper_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_ai_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_scraper_sources
CREATE POLICY "Admins can manage scraper sources" ON trip_scraper_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for trip_scraper_results
CREATE POLICY "Admins can manage scraper results" ON trip_scraper_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for scraper_ai_config
CREATE POLICY "Admins can manage AI config" ON scraper_ai_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraper_sources_active ON trip_scraper_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_scraper_results_job_id ON trip_scraper_results(job_id);
CREATE INDEX IF NOT EXISTS idx_scraper_results_import_status ON trip_scraper_results(import_status);
CREATE INDEX IF NOT EXISTS idx_scraper_ai_config_active ON scraper_ai_config(is_active);

-- Insert default AI configuration (using environment variable for model)
INSERT INTO scraper_ai_config (provider, model_name, model_version, is_active)
VALUES ('openai', 'gpt-4o-mini', 'latest', true)
ON CONFLICT DO NOTHING;

-- Insert some default scraping sources
INSERT INTO trip_scraper_sources (name, url, source_type, is_active, rate_limit, selectors) VALUES
('WikiVoyage Australia', 'https://en.wikivoyage.org/wiki/Australia', 'scraper', true, 30, 
  '{"title": "h1.firstHeading", "content": "#mw-content-text", "images": "img.thumbimage"}'::jsonb),
('National Parks Service', 'https://www.nps.gov/subjects/developer/api-documentation.htm', 'api', true, 1000,
  '{"endpoint": "/parks", "params": {"stateCode": "CA", "limit": 50}}'::jsonb),
('OpenStreetMap Overpass', 'https://overpass-api.de/api/interpreter', 'api', true, 100,
  '{"query_template": "[out:json];way[highway=scenic]({{bbox}});out;"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_trip_scraper_sources_updated_at BEFORE UPDATE ON trip_scraper_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraper_ai_config_updated_at BEFORE UPDATE ON scraper_ai_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();