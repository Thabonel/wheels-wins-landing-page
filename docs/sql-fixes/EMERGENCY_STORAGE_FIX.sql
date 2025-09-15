-- ================================================
-- EMERGENCY FIX: Storage Schema is COMPLETELY BROKEN
-- Run this in Supabase SQL Editor IMMEDIATELY
-- ================================================

-- STEP 1: Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- STEP 2: Grant permissions on schema
GRANT USAGE ON SCHEMA storage TO postgres, anon, authenticated, service_role;

-- STEP 3: Create the missing buckets table
CREATE TABLE IF NOT EXISTS storage.buckets (
    id text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    owner uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text
);

-- STEP 4: Create the missing objects table  
CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bucket_id text REFERENCES storage.buckets(id),
    name text NOT NULL,
    owner uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_accessed_at timestamptz DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);

-- STEP 5: Create unique constraint on objects
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'objects_bucketid_name_key'
    ) THEN
        ALTER TABLE storage.objects ADD CONSTRAINT objects_bucketid_name_key UNIQUE (bucket_id, name);
    END IF;
END $$;

-- STEP 6: Grant ALL permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA storage TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA storage TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA storage TO anon;

-- STEP 7: Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA storage TO authenticated, anon, service_role;

-- STEP 8: Create the avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars', 
    true,
    10485760,
    ARRAY['image/*']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/*'];

-- STEP 9: Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- STEP 10: Create simple RLS policies
DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete" ON storage.objects;

CREATE POLICY "Anyone can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can view" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars');

-- STEP 11: Create helper functions
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE SQL
IMMUTABLE
AS $$
SELECT string_to_array(name, '/');
$$;

CREATE OR REPLACE FUNCTION storage.filename(name text)
RETURNS text
LANGUAGE SQL
IMMUTABLE
AS $$
SELECT (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)];
$$;

CREATE OR REPLACE FUNCTION storage.extension(name text)
RETURNS text
LANGUAGE SQL
IMMUTABLE
AS $$
SELECT split_part(name, '.', array_length(string_to_array(name, '.'), 1));
$$;

-- STEP 12: Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA storage TO authenticated, anon, service_role;

-- STEP 13: Verify everything worked
DO $$
DECLARE
    bucket_exists boolean;
    objects_exists boolean;
    bucket_count integer;
BEGIN
    -- Check tables exist
    SELECT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') INTO bucket_exists;
    SELECT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') INTO objects_exists;
    
    -- Check avatars bucket
    SELECT COUNT(*) INTO bucket_count FROM storage.buckets WHERE id = 'avatars';
    
    RAISE NOTICE '==================================';
    RAISE NOTICE 'STORAGE FIX RESULTS:';
    RAISE NOTICE 'storage.buckets table exists: %', bucket_exists;
    RAISE NOTICE 'storage.objects table exists: %', objects_exists;
    RAISE NOTICE 'avatars bucket exists: %', bucket_count > 0;
    RAISE NOTICE '==================================';
    
    IF bucket_exists AND objects_exists AND bucket_count > 0 THEN
        RAISE NOTICE '✅ SUCCESS! Storage is fixed and avatar upload should work!';
    ELSE
        RAISE WARNING '⚠️ Some issues remain. Check the results above.';
    END IF;
END $$;

-- STEP 14: Test query
SELECT 'Storage Fixed!' as status, COUNT(*) as bucket_count FROM storage.buckets WHERE id = 'avatars';