-- Fix storage permissions for authenticated users
-- This migration grants necessary permissions on storage tables

-- Grant usage on storage schema
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO service_role;

-- Grant permissions on storage.objects table
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT ALL ON storage.objects TO service_role;

-- Grant permissions on storage.buckets table
GRANT SELECT ON storage.buckets TO authenticated;
GRANT SELECT ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO service_role;

-- Grant usage on sequences if they exist
DO $$
BEGIN
    -- Check if any sequences exist in storage schema
    IF EXISTS (
        SELECT 1 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'storage'
    ) THEN
        EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA storage TO authenticated';
        EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA storage TO anon';
        EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA storage TO service_role';
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies with proper permissions
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;

-- Create new policies
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Authenticated users can update their uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images')
WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Authenticated users can delete their uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images');

CREATE POLICY "Anyone can view uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- Verify the permissions were granted
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.table_privileges
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
    AND grantee = 'authenticated';
    
    IF v_count = 0 THEN
        RAISE EXCEPTION 'Failed to grant permissions to authenticated role';
    END IF;
    
    RAISE NOTICE 'Storage permissions successfully configured. Found % privileges for authenticated role', v_count;
END $$;