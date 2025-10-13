-- Clear all wrong photos from trip templates
-- This removes all photos from media_urls field so you can manually add correct ones
UPDATE trip_templates SET media_urls = '[]'::jsonb WHERE jsonb_array_length(media_urls) > 0;

-- Verify all photos are cleared
SELECT
    name,
    jsonb_array_length(media_urls) as photo_count,
    media_urls
FROM trip_templates
WHERE jsonb_array_length(media_urls) > 0
ORDER BY name;