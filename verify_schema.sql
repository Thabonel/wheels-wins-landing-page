-- Verify all required columns exist for data collector
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('trip_locations', 'trip_templates', 'data_collector_state', 'data_collector_runs')
    AND column_name IN (
        -- trip_locations critical columns
        'photo_confidence', 'location_hash', 'data_sources', 'quality_score',
        'verified', 'country', 'state_province', 'data_source', 'collected_at',
        'photo_source', 'photo_stored',

        -- trip_templates critical columns
        'template_type', 'media_urls', 'waypoints', 'estimated_duration',
        'difficulty_level', 'usage_count'
    )
ORDER BY table_name, column_name;