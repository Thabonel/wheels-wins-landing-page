-- First, check if storage.objects exists and has the profile-images bucket
DO $$
BEGIN
    -- Check if the profile-images bucket exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profile-images') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'profile-images',
            'profile-images', 
            true,
            10485760, -- 10MB limit
            ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
        );
    END IF;
END $$;

-- Drop ALL existing policies for profile-images to start fresh
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname LIKE '%profile%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Create new simplified policies with unique names
CREATE POLICY "profile_images_insert_auth_users"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "profile_images_select_public_users"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "profile_images_update_auth_users"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images')
WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "profile_images_delete_auth_users"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images');

-- Ensure the bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'profile-images';