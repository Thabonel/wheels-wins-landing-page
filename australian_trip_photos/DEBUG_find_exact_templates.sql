-- Find the EXACT template names that exist in your database
SELECT
    id,
    name,
    jsonb_array_length(media_urls) as photo_count,
    media_urls
FROM trip_templates
WHERE (
    name ILIKE '%great ocean%' OR
    name ILIKE '%big lap%' OR
    name ILIKE '%east coast%' OR
    name ILIKE '%red centre%' OR
    name ILIKE '%tasmania%' OR
    name ILIKE '%southwest%' OR
    name ILIKE '%flinders%' OR
    name ILIKE '%savannah%' OR
    name ILIKE '%queensland%' OR
    name ILIKE '%murray%' OR
    name ILIKE '%gibb%' OR
    name ILIKE '%victorian%' OR
    name ILIKE '%nullarbor%' OR
    name ILIKE '%cape york%' OR
    name ILIKE '%sunshine%'
)
ORDER BY name;