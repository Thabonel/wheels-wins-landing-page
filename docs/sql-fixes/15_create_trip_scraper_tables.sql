-- Create missing tables for trip scraper functionality
-- This fixes the database schema issues preventing data collection

-- Trip scraper sources configuration
CREATE TABLE IF NOT EXISTS public.trip_scraper_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'scraper', -- 'scraper', 'api', 'rss'
    region TEXT DEFAULT 'Global',
    selectors JSONB DEFAULT '{}', -- CSS selectors for web scraping
    api_config JSONB DEFAULT '{}', -- API configuration
    active BOOLEAN DEFAULT true,
    last_scraped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip scraper jobs tracking
CREATE TABLE IF NOT EXISTS public.trip_scraper_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    source_url TEXT NOT NULL,
    region TEXT DEFAULT 'Global',
    parameters JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    templates_created INTEGER DEFAULT 0,
    results JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip scraper results
CREATE TABLE IF NOT EXISTS public.trip_scraper_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES trip_scraper_jobs(id) ON DELETE CASCADE,
    source_id UUID REFERENCES trip_scraper_sources(id) ON DELETE CASCADE,
    raw_data JSONB NOT NULL,
    processed_data JSONB NOT NULL,
    template_data JSONB NOT NULL,
    images_found TEXT[] DEFAULT '{}',
    quality_score FLOAT DEFAULT 0.0,
    ai_enhanced BOOLEAN DEFAULT false,
    import_status TEXT DEFAULT 'pending', -- 'pending', 'imported', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.trip_scraper_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_scraper_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_scraper_results ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can manage scraper sources" ON trip_scraper_sources
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage scraper jobs" ON trip_scraper_jobs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage scraper results" ON trip_scraper_results
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated users to view scraper data
CREATE POLICY "Users can view scraper sources" ON trip_scraper_sources
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view scraper jobs" ON trip_scraper_jobs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view scraper results" ON trip_scraper_results
    FOR SELECT TO authenticated USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_scraper_jobs_status ON trip_scraper_jobs(status);
CREATE INDEX IF NOT EXISTS idx_trip_scraper_jobs_created_at ON trip_scraper_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_trip_scraper_results_job_id ON trip_scraper_results(job_id);
CREATE INDEX IF NOT EXISTS idx_trip_scraper_results_source_id ON trip_scraper_results(source_id);
CREATE INDEX IF NOT EXISTS idx_trip_scraper_results_quality_score ON trip_scraper_results(quality_score);

-- Insert some default scraper sources
INSERT INTO public.trip_scraper_sources (name, url, source_type, region, selectors) VALUES
('Recreation.gov Campgrounds', 'https://www.recreation.gov/api/camps', 'api', 'USA', '{}'),
('National Parks Service', 'https://www.nps.gov/subjects/camping/campground.htm', 'scraper', 'USA', '{"title": "h1", "description": ".description", "content": ".content-wrapper"}'),
('Australia Tourism', 'https://www.australia.com/en/things-to-do/nature-and-wildlife/national-parks.html', 'scraper', 'Australia', '{"title": "h1", "description": ".hero-text", "content": ".content"}')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL ON trip_scraper_sources TO service_role;
GRANT ALL ON trip_scraper_jobs TO service_role;
GRANT ALL ON trip_scraper_results TO service_role;

GRANT SELECT ON trip_scraper_sources TO authenticated;
GRANT SELECT ON trip_scraper_jobs TO authenticated;
GRANT SELECT ON trip_scraper_results TO authenticated;