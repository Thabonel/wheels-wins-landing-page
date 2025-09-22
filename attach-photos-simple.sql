-- Simple SQL to attach photos to trip templates
-- Add photos to templates that match city names

-- Sydney templates
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/sydney_australia.jpg"]'::jsonb
WHERE name ILIKE '%sydney%' AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/sydney_australia.jpg"]');

-- Tokyo templates
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/tokyo_japan.jpg"]'::jsonb
WHERE name ILIKE '%tokyo%' AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/tokyo_japan.jpg"]');

-- Paris templates
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/paris_france.jpg"]'::jsonb
WHERE name ILIKE '%paris%' AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/paris_france.jpg"]');

-- London templates
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/london_uk.jpg"]'::jsonb
WHERE name ILIKE '%london%' AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/london_uk.jpg"]');

-- Rome templates
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/rome_italy.jpg"]'::jsonb
WHERE name ILIKE '%rome%' AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/rome_italy.jpg"]');

-- Bangkok templates
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/bangkok_thailand.jpg"]'::jsonb
WHERE name ILIKE '%bangkok%' AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/bangkok_thailand.jpg"]');

-- Berlin templates
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/berlin_germany.jpg"]'::jsonb
WHERE name ILIKE '%berlin%' AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/berlin_germany.jpg"]');

-- Dubai templates
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/dubai_uae.jpg"]'::jsonb
WHERE name ILIKE '%dubai%' AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/dubai_uae.jpg"]');

-- Istanbul templates
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/istanbul_turkey.jpg"]'::jsonb
WHERE name ILIKE '%istanbul%' AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/istanbul_turkey.jpg"]');

-- Barcelona templates
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/barcelona_spain.jpg"]'::jsonb
WHERE name ILIKE '%barcelona%' AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/barcelona_spain.jpg"]');

-- Check results
SELECT
    name,
    CASE WHEN jsonb_array_length(media_urls) > 0 THEN 'Has Photos' ELSE 'No Photos' END as photo_status,
    jsonb_array_length(media_urls) as photo_count
FROM trip_templates
WHERE name ILIKE ANY(ARRAY['%sydney%', '%tokyo%', '%paris%', '%london%', '%rome%', '%bangkok%', '%berlin%', '%dubai%', '%istanbul%', '%barcelona%'])
ORDER BY name;