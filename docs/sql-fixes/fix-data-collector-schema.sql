-- Fix trip_templates schema for data collector compatibility
-- Add missing columns that the data collector expects

-- Add template_type column to distinguish system vs user templates
ALTER TABLE trip_templates ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'user';

-- Add media_urls column for photo storage URLs
ALTER TABLE trip_templates ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]';

-- Add waypoints column for route data
ALTER TABLE trip_templates ADD COLUMN IF NOT EXISTS waypoints JSONB DEFAULT '[]';

-- Add estimated_duration column for trip planning
ALTER TABLE trip_templates ADD COLUMN IF NOT EXISTS estimated_duration INTEGER DEFAULT 1;

-- Add difficulty_level column for trip classification
ALTER TABLE trip_templates ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'easy';

-- Create index for system templates (for performance)
CREATE INDEX IF NOT EXISTS idx_trip_templates_template_type ON trip_templates(template_type);

-- Create index for featured templates
CREATE INDEX IF NOT EXISTS idx_trip_templates_featured ON trip_templates(is_featured) WHERE is_featured = true;