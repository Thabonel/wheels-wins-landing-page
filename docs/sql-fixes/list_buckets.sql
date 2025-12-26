-- List all existing storage buckets
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
ORDER BY created_at DESC;
