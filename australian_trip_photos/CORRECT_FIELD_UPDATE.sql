-- CORRECT FIELD UPDATE - Use imageUrl and image_url fields, NOT media_urls
-- The frontend checks template.imageUrl and template.image_url, NOT media_urls

-- Clear existing wrong fields
UPDATE trip_templates SET image_url = NULL, imageUrl = NULL;

-- Update correct fields for Australian templates

-- Great Ocean Road Classic → Twelve Apostles
UPDATE trip_templates
SET
    image_url = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/twelve_apostles_victoria_2006.jpg',
    imageUrl = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/twelve_apostles_victoria_2006.jpg'
WHERE name = 'Great Ocean Road Classic';

-- The Big Lap - Around Australia → Uluru
UPDATE trip_templates
SET
    image_url = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg',
    imageUrl = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg'
WHERE name = 'The Big Lap - Around Australia';

-- East Coast Discovery → Great Barrier Reef
UPDATE trip_templates
SET
    image_url = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/great_barrier_reef.jpg',
    imageUrl = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/great_barrier_reef.jpg'
WHERE name = 'East Coast Discovery';

-- Red Centre Explorer → Uluru
UPDATE trip_templates
SET
    image_url = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg',
    imageUrl = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg'
WHERE name = 'Red Centre Explorer';

-- Tasmania Circuit → Cradle Mountain
UPDATE trip_templates
SET
    image_url = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/cradle_mountain_dove_lake.jpg',
    imageUrl = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/cradle_mountain_dove_lake.jpg'
WHERE name = 'Tasmania Circuit';

-- Southwest WA Wine & Surf → Margaret River
UPDATE trip_templates
SET
    image_url = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/margaret_river_winery.jpg',
    imageUrl = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/margaret_river_winery.jpg'
WHERE name = 'Southwest WA Wine & Surf';

-- Flinders Ranges Expedition → Wilpena Pound
UPDATE trip_templates
SET
    image_url = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/wilpena_pound_eastern_boundary.jpg',
    imageUrl = 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/wilpena_pound_eastern_boundary.jpg'
WHERE name = 'Flinders Ranges Expedition';

-- Check results
SELECT
    name,
    CASE WHEN image_url IS NOT NULL THEN 'HAS IMAGE' ELSE 'NO IMAGE' END as status,
    image_url
FROM trip_templates
WHERE name IN (
    'Great Ocean Road Classic',
    'The Big Lap - Around Australia',
    'East Coast Discovery',
    'Red Centre Explorer',
    'Tasmania Circuit',
    'Southwest WA Wine & Surf',
    'Flinders Ranges Expedition'
)
ORDER BY name;