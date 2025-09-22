UPDATE trip_templates
SET media_urls = '[]'::jsonb
WHERE jsonb_array_length(media_urls) > 0;

SELECT name, jsonb_array_length(media_urls) as photo_count
FROM trip_templates
WHERE jsonb_array_length(media_urls) > 0;