-- Connect Australian Trip Photos to Templates
-- Run this AFTER uploading photos to trip-images bucket

-- Great Ocean Road Classic - Twelve Apostles
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/twelve_apostles_victoria_2006.jpg"]'::jsonb
WHERE name ILIKE '%great ocean road%'
AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/twelve_apostles_victoria_2006.jpg"]');

-- Red Centre Explorer - Uluru
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg"]'::jsonb
WHERE name ILIKE '%red centre%'
AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg"]');

-- East Coast Discovery - Great Barrier Reef
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/great_barrier_reef.jpg"]'::jsonb
WHERE name ILIKE '%east coast%'
AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/great_barrier_reef.jpg"]');

-- East Coast Discovery - Byron Bay Beach
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/byron_bay_beach.jpg"]'::jsonb
WHERE name ILIKE '%east coast%'
AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/byron_bay_beach.jpg"]');

-- Tasmania Circuit - Cradle Mountain
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/cradle_mountain_dove_lake.jpg"]'::jsonb
WHERE name ILIKE '%tasmania%'
AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/cradle_mountain_dove_lake.jpg"]');

-- Tasmania Circuit - Wineglass Bay
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/wineglass_bay_beach.jpg"]'::jsonb
WHERE name ILIKE '%tasmania%'
AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/wineglass_bay_beach.jpg"]');

-- Flinders Ranges - Wilpena Pound
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/wilpena_pound_eastern_boundary.jpg"]'::jsonb
WHERE name ILIKE '%flinders%'
AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/wilpena_pound_eastern_boundary.jpg"]');

-- Southwest WA - Margaret River
UPDATE trip_templates
SET media_urls = COALESCE(media_urls, '[]'::jsonb) || '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/margaret_river_winery.jpg"]'::jsonb
WHERE name ILIKE '%southwest%' OR name ILIKE '%margaret%'
AND NOT (media_urls @> '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/margaret_river_winery.jpg"]');

-- Check results
SELECT
    name,
    CASE WHEN jsonb_array_length(media_urls) > 0 THEN 'Has Photos' ELSE 'No Photos' END as photo_status,
    jsonb_array_length(media_urls) as photo_count,
    media_urls
FROM trip_templates
WHERE name ILIKE ANY(ARRAY[
    '%great ocean road%',
    '%red centre%',
    '%east coast%',
    '%tasmania%',
    '%flinders%',
    '%southwest%'
])
ORDER BY name;