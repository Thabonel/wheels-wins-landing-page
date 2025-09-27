-- Check Results After Enhanced Data Collector + Schema Fixes
-- Run these queries in Supabase SQL Editor to see the improvements

-- 1. Check total counts in both tables
SELECT 'trip_templates' as table_name, COUNT(*) as total_count FROM trip_templates
UNION ALL
SELECT 'trip_locations' as table_name, COUNT(*) as total_count FROM trip_locations;

-- 2. Check recent additions (last hour)
SELECT
  'trip_templates' as table_name,
  COUNT(*) as added_recently,
  COUNT(CASE WHEN data_source != 'user_created' THEN 1 END) as enhanced_sources
FROM trip_templates
WHERE created_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT
  'trip_locations' as table_name,
  COUNT(*) as added_recently,
  COUNT(CASE WHEN data_source != 'user_created' THEN 1 END) as enhanced_sources
FROM trip_locations
WHERE created_at > NOW() - INTERVAL '1 hour';

-- 3. Data source breakdown for trip_templates
SELECT
  data_source,
  template_type,
  COUNT(*) as count,
  MAX(created_at) as latest_entry
FROM trip_templates
GROUP BY data_source, template_type
ORDER BY latest_entry DESC;

-- 4. Data source breakdown for trip_locations
SELECT
  data_source,
  country,
  COUNT(*) as count,
  MAX(created_at) as latest_entry
FROM trip_locations
GROUP BY data_source, country
ORDER BY latest_entry DESC;

-- 5. Show recent enhanced entries
SELECT
  name,
  data_source,
  country,
  created_at
FROM trip_locations
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND data_source != 'user_created'
ORDER BY created_at DESC
LIMIT 20;

-- 6. Geographic distribution of new data
SELECT
  country,
  COUNT(*) as locations_found
FROM trip_locations
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY country
ORDER BY locations_found DESC;