-- STEP 2: Connect photos to correct Australian templates

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