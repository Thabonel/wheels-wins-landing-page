-- Check if trip_template_images table exists and its structure
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'trip_template_images'
) as table_exists;

-- If it exists, show the structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'trip_template_images'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current trip_templates structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'trip_templates'
AND table_schema = 'public'
ORDER BY ordinal_position;