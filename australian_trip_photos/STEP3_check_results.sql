-- STEP 3: Check which templates now have photos
SELECT
    name,
    CASE WHEN jsonb_array_length(media_urls) > 0 THEN 'Has Photos' ELSE 'No Photos' END as status,
    jsonb_array_length(media_urls) as count
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