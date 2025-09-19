-- Create trip_templates table with media_urls for photo storage
CREATE TABLE trip_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_public BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    media_urls TEXT[], -- Array of media URLs like posts table
    template_data JSONB DEFAULT '{}',
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE trip_templates ENABLE ROW LEVEL SECURITY;

-- Users can view public templates or their own
CREATE POLICY "trip_templates_select" ON trip_templates FOR SELECT USING (
    is_public = true OR profile_id = (SELECT auth.uid())
);

-- Users can insert their own templates
CREATE POLICY "trip_templates_insert" ON trip_templates FOR INSERT WITH CHECK (
    profile_id = (SELECT auth.uid())
);

-- Users can update their own templates
CREATE POLICY "trip_templates_update" ON trip_templates FOR UPDATE USING (
    profile_id = (SELECT auth.uid())
);

-- Users can delete their own templates
CREATE POLICY "trip_templates_delete" ON trip_templates FOR DELETE USING (
    profile_id = (SELECT auth.uid())
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trip_templates_updated_at
    BEFORE UPDATE ON trip_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_trip_templates_profile_id ON trip_templates(profile_id);
CREATE INDEX idx_trip_templates_category ON trip_templates(category);
CREATE INDEX idx_trip_templates_is_public ON trip_templates(is_public);
CREATE INDEX idx_trip_templates_tags ON trip_templates USING GIN(tags);