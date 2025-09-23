-- FINAL CORRECT CONNECTIONS - Based on exact template names from UI

-- Clear all existing wrong photos first
UPDATE trip_templates SET media_urls = '[]'::jsonb;

-- Connect photos to EXACT template names from your UI

-- 1. Great Ocean Road Classic → Twelve Apostles
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/twelve_apostles_victoria_2006.jpg"]'::jsonb
WHERE name = 'Great Ocean Road Classic';

-- 2. The Big Lap - Around Australia → Uluru
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg"]'::jsonb
WHERE name = 'The Big Lap - Around Australia';

-- 3. East Coast Discovery → Great Barrier Reef + Byron Bay
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/great_barrier_reef.jpg", "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/byron_bay_beach.jpg"]'::jsonb
WHERE name = 'East Coast Discovery';

-- 4. Red Centre Explorer → Uluru
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg"]'::jsonb
WHERE name = 'Red Centre Explorer';

-- 5. Tasmania Circuit → Cradle Mountain + Wineglass Bay
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/cradle_mountain_dove_lake.jpg", "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/wineglass_bay_beach.jpg"]'::jsonb
WHERE name = 'Tasmania Circuit';

-- 6. Southwest WA Wine & Surf → Margaret River
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/margaret_river_winery.jpg"]'::jsonb
WHERE name = 'Southwest WA Wine & Surf';

-- 7. Flinders Ranges Expedition → Wilpena Pound
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/wilpena_pound_eastern_boundary.jpg"]'::jsonb
WHERE name = 'Flinders Ranges Expedition';

-- Check results - show which templates now have photos
SELECT
    name,
    CASE WHEN jsonb_array_length(media_urls) > 0 THEN 'HAS PHOTOS' ELSE 'NO PHOTOS' END as status,
    jsonb_array_length(media_urls) as photo_count,
    media_urls
FROM trip_templates
WHERE name IN (
    'Great Ocean Road Classic',
    'The Big Lap - Around Australia',
    'East Coast Discovery',
    'Red Centre Explorer',
    'Savannah Way Adventure',
    'Tasmania Circuit',
    'Southwest WA Wine & Surf',
    'Queensland Outback Trail',
    'Murray River Journey',
    'Gibb River Road Expedition',
    'Victorian High Country',
    'Nullarbor Plain Crossing',
    'Cape York Peninsula 4WD',
    'Flinders Ranges Expedition',
    'Sunshine Coast Hinterland'
)
ORDER BY
    CASE WHEN jsonb_array_length(media_urls) > 0 THEN 1 ELSE 2 END,
    name;