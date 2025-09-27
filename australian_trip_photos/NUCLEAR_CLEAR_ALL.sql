-- NUCLEAR OPTION: Clear ALL photos from ALL templates
-- Then we can start fresh and connect only to the right ones

UPDATE trip_templates
SET media_urls = '[]'::jsonb
WHERE jsonb_array_length(media_urls) > 0;

-- Check that all photos are cleared
SELECT name, jsonb_array_length(media_urls) as photo_count
FROM trip_templates
WHERE jsonb_array_length(media_urls) > 0;