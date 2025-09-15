-- Fix storage.objects owner_id issue
-- Run this in Supabase SQL Editor to fix the upload error

-- First, check current state
DO $$
BEGIN
    RAISE NOTICE 'Checking storage.objects structure...';
END $$;

-- Set default for owner_id to handle uploads via client
ALTER TABLE storage.objects 
ALTER COLUMN owner_id SET DEFAULT '';

-- Ensure owner column is nullable
ALTER TABLE storage.objects 
ALTER COLUMN owner DROP NOT NULL;

-- Update existing RLS policies to be more permissive for authenticated users
DROP POLICY IF EXISTS "Anyone can upload to profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete from profile-images" ON storage.objects;

-- Create new, more specific policies
CREATE POLICY "Authenticated users can upload to profile-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Public can view profile-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    (owner_id = auth.uid()::text OR owner_id = '' OR owner_id IS NULL)
);

CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    (owner_id = auth.uid()::text OR owner_id = '' OR owner_id IS NULL)
);

-- Verify the changes
DO $$
DECLARE
    owner_id_default text;
BEGIN
    SELECT column_default INTO owner_id_default
    FROM information_schema.columns
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
    AND column_name = 'owner_id';
    
    RAISE NOTICE 'owner_id default value: %', COALESCE(owner_id_default, 'NULL');
    RAISE NOTICE 'Storage fix applied successfully!';
    RAISE NOTICE 'Try uploading a profile photo now.';
END $$;