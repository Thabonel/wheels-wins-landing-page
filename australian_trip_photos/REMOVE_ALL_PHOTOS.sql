-- Remove ALL photos from ALL templates
UPDATE trip_templates SET media_urls = '[]'::jsonb;