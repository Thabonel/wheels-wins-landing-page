-- Trip Template Helper Functions
-- Function to increment template usage count

CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE trip_templates 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get regional trip templates with fallback
CREATE OR REPLACE FUNCTION get_regional_trip_templates(user_region TEXT, max_results INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    template_data JSONB,
    category TEXT,
    tags TEXT[],
    usage_count INTEGER,
    is_public BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- First try to get region-specific templates
    RETURN QUERY
    SELECT t.id, t.name, t.description, t.template_data, t.category, t.tags, t.usage_count, t.is_public, t.created_at, t.updated_at
    FROM trip_templates t
    WHERE t.is_public = true 
    AND (t.template_data->>'region' = user_region OR t.template_data->>'region' IS NULL)
    ORDER BY t.usage_count DESC, t.created_at DESC
    LIMIT max_results;
    
    -- If no results, try to get any public templates
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT t.id, t.name, t.description, t.template_data, t.category, t.tags, t.usage_count, t.is_public, t.created_at, t.updated_at
        FROM trip_templates t
        WHERE t.is_public = true
        ORDER BY t.usage_count DESC, t.created_at DESC
        LIMIT max_results;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_template_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_regional_trip_templates(TEXT, INTEGER) TO authenticated, anon;