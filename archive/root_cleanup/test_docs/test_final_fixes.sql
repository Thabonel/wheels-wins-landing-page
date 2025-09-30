-- Test if all fixes are working

-- 1. Test schema cache refresh (check if columns are now accessible)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'trip_locations'
    AND column_name IN ('photo_confidence', 'location_hash', 'data_sources', 'quality_score');

-- 2. Test RLS policies are working
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'trip_templates';

-- 3. Test a simple insert to trip_locations (as service role should work)
-- This simulates what the data collector is trying to do
INSERT INTO trip_locations (
    name,
    latitude,
    longitude,
    location_hash,
    data_source,
    quality_score,
    verified,
    photo_confidence
) VALUES (
    'Test Location',
    -33.8688,
    151.2093,
    'test_hash_123',
    'test_source',
    0.8,
    false,
    0.7
) ON CONFLICT DO NOTHING;

-- 4. Test trip_templates insert (system template)
INSERT INTO trip_templates (
    user_id,
    name,
    description,
    category,
    template_type,
    is_public,
    is_featured,
    tags,
    media_urls,
    waypoints,
    estimated_duration,
    difficulty_level,
    usage_count
) VALUES (
    NULL,  -- System template (NULL user_id)
    'Test System Template',
    'Test description',
    'adventure',
    'system',
    true,
    false,
    ARRAY['test', 'system'],
    '[]'::jsonb,
    '[]'::jsonb,
    1,
    'easy',
    0
) ON CONFLICT DO NOTHING;

-- 5. Check if inserts worked
SELECT COUNT(*) as trip_locations_count FROM trip_locations WHERE name = 'Test Location';
SELECT COUNT(*) as trip_templates_count FROM trip_templates WHERE name = 'Test System Template';

-- Clean up test data
DELETE FROM trip_locations WHERE name = 'Test Location';
DELETE FROM trip_templates WHERE name = 'Test System Template';