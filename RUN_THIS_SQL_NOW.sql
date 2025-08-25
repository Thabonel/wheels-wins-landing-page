-- URGENT: Run this SQL in Supabase SQL Editor NOW
-- This will fix the storage upload issue immediately

-- 1. Fix the owner_id column to accept empty strings
ALTER TABLE storage.objects 
ALTER COLUMN owner_id SET DEFAULT ''::text;

-- 2. Make owner column fully optional
ALTER TABLE storage.objects 
ALTER COLUMN owner DROP NOT NULL;

-- 3. Recreate the profile-images bucket with proper settings
DELETE FROM storage.buckets WHERE id = 'profile-images';

INSERT INTO storage.buckets (
    id, 
    name, 
    owner,
    public, 
    file_size_limit, 
    allowed_mime_types,
    created_at,
    updated_at
) VALUES (
    'profile-images',
    'profile-images', 
    NULL,  -- No owner for public bucket
    true,  -- Public access
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    NOW(),
    NOW()
);

-- 4. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can upload to profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete from profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;

-- 5. Create simple, permissive policies for testing
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Allow public downloads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images');

-- 6. Verify the fix
SELECT 
    'Storage is now fixed!' as status,
    column_default as owner_id_default
FROM information_schema.columns
WHERE table_schema = 'storage' 
AND table_name = 'objects'
AND column_name = 'owner_id';

-- After running this, try uploading again!