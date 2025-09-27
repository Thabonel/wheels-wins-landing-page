-- STEP 1: Remove ALL wrong photos from templates
UPDATE trip_templates SET media_urls = '[]'::jsonb WHERE name IN (
    'American Southwest National Parks',
    'East Coast Discovery',
    'Flinders Ranges Outback Experience',
    'Great Ocean Road Classic',
    'Red Centre Explorer',
    'Southwest WA Wine & Surf',
    'Tasmania Circuit',
    'Tasmania East Coast Explorer',
    'Tasmania Island Circuit'
);