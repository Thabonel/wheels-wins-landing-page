-- TARGETED FIX: Update by exact ID instead of name matching
-- First, run DEBUG_find_exact_templates.sql to get the IDs

-- Example (you'll need to replace with actual IDs from debug query):
-- UPDATE trip_templates SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/twelve_apostles_victoria_2006.jpg"]'::jsonb WHERE id = 'actual-id-here';

-- OR try exact name matching with no wildcards:

-- Clear specific wrong assignments first
UPDATE trip_templates SET media_urls = '[]'::jsonb WHERE name = 'American Southwest National Parks';
UPDATE trip_templates SET media_urls = '[]'::jsonb WHERE name = 'Tasmania East Coast Explorer';

-- Then assign with exact names
UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/twelve_apostles_victoria_2006.jpg"]'::jsonb
WHERE name = 'Great Ocean Road Classic';

UPDATE trip_templates
SET media_urls = '["https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg"]'::jsonb
WHERE name = 'The Big Lap - Around Australia';

-- Continue for each template...