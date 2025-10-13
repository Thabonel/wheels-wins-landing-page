-- Connect Correct Photos to Trip Templates
-- This script connects semantically correct photos from Supabase storage to their matching trip templates

-- First clear any existing wrong photos
UPDATE trip_templates SET media_urls = '[]'::jsonb WHERE jsonb_array_length(media_urls) > 0;

-- AUSTRALIAN TRIP TEMPLATES (8 photos available)

-- Great Ocean Road Classic → Twelve Apostles
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/twelve_apostles_victoria_2006.jpg"]'::jsonb
WHERE name = 'Great Ocean Road Classic';

-- The Big Lap - Around Australia → Uluru
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg"]'::jsonb
WHERE name = 'The Big Lap - Around Australia';

-- East Coast Discovery → Great Barrier Reef + Byron Bay
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/great_barrier_reef.jpg", "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/byron_bay_beach.jpg"]'::jsonb
WHERE name = 'East Coast Discovery';

-- Red Centre Explorer → Uluru
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg"]'::jsonb
WHERE name = 'Red Centre Explorer';

-- Tasmania Circuit → Cradle Mountain + Wineglass Bay
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/cradle_mountain_dove_lake.jpg", "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/wineglass_bay_beach.jpg"]'::jsonb
WHERE name = 'Tasmania Circuit';

-- Southwest WA Wine & Surf → Margaret River
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/margaret_river_winery.jpg"]'::jsonb
WHERE name = 'Southwest WA Wine & Surf';

-- Flinders Ranges Expedition → Wilpena Pound
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/wilpena_pound_eastern_boundary.jpg"]'::jsonb
WHERE name = 'Flinders Ranges Expedition';

-- INTERNATIONAL TEMPLATES (if they exist)

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

-- Verification query to see which templates now have photos
SELECT
    name,
    jsonb_array_length(media_urls) as media_count,
    media_urls
FROM trip_templates
WHERE jsonb_array_length(media_urls) > 0
ORDER BY name;