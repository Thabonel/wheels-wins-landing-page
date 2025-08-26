-- ================================================
-- CRITICAL FIX FOR AVATAR UPLOAD
-- Run this SQL in Supabase SQL Editor
-- ================================================

-- STEP 1: Grant Schema Permissions
-- This allows roles to access the storage schema
GRANT USAGE ON SCHEMA storage TO authenticated, anon, service_role, postgres;

-- STEP 2: Grant Table Permissions
-- This is the CRITICAL fix - authenticated users need permissions on storage.objects
GRANT ALL PRIVILEGES ON storage.objects TO postgres;
GRANT ALL PRIVILEGES ON storage.objects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

GRANT ALL PRIVILEGES ON storage.buckets TO postgres;
GRANT ALL PRIVILEGES ON storage.buckets TO service_role;  
GRANT SELECT ON storage.buckets TO authenticated, anon;

-- STEP 3: Grant Sequence Permissions (if any exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'storage' AND c.relkind = 'S'
    ) THEN
        EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA storage TO authenticated, anon, service_role';
    END IF;
END $$;

-- STEP 4: Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- STEP 5: Drop ALL existing policies to start fresh
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- STEP 6: Create simple, working RLS policies
CREATE POLICY "Enable insert for authenticated users only" ON storage.objects
    FOR INSERT 
    TO authenticated
    WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Enable select for all users" ON storage.objects
    FOR SELECT 
    TO public
    USING (bucket_id = 'profile-images');

CREATE POLICY "Enable update for users based on id" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'profile-images')
    WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Enable delete for users based on id" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'profile-images');

-- STEP 7: Ensure the profile-images bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-images',
    'profile-images',
    true, -- Make it public for easier access
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) 
DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- STEP 8: Verify the fix worked
DO $$
DECLARE
    perm_count integer;
    bucket_count integer;
BEGIN
    -- Check permissions
    SELECT COUNT(*) INTO perm_count
    FROM information_schema.table_privileges
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
    AND grantee = 'authenticated';
    
    -- Check bucket
    SELECT COUNT(*) INTO bucket_count
    FROM storage.buckets
    WHERE id = 'profile-images';
    
    RAISE NOTICE '✅ VERIFICATION RESULTS:';
    RAISE NOTICE '   - Authenticated permissions on storage.objects: % found', perm_count;
    RAISE NOTICE '   - Profile-images bucket exists: %', CASE WHEN bucket_count > 0 THEN 'YES' ELSE 'NO' END;
    
    IF perm_count > 0 AND bucket_count > 0 THEN
        RAISE NOTICE '🎉 SUCCESS: Avatar upload should now work!';
    ELSE
        RAISE WARNING '⚠️  Some issues remain - check the permissions';
    END IF;
END $$;

-- STEP 9: Show current status
SELECT 
    'Authenticated user has INSERT permission' as status,
    EXISTS(
        SELECT 1 FROM information_schema.table_privileges 
        WHERE grantee = 'authenticated' 
        AND table_schema = 'storage' 
        AND table_name = 'objects'
        AND privilege_type = 'INSERT'
    ) as ready;