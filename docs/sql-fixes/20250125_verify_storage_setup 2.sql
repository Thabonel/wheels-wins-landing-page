-- Migration: Verify and setup storage for profile images
-- Date: 2025-01-25
-- Purpose: Ensure storage infrastructure is properly initialized

-- Check if storage schema exists
DO $$
BEGIN
    -- Check if storage schema exists
    IF NOT EXISTS (
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'storage'
    ) THEN
        RAISE NOTICE 'Storage schema does not exist. Storage needs to be enabled in Supabase Dashboard.';
        RAISE NOTICE 'Visit: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/storage/buckets';
        RAISE NOTICE 'Click "Set up Storage" if button is available.';
    ELSE
        RAISE NOTICE 'Storage schema exists.';
        
        -- Check if storage.objects table exists
        IF NOT EXISTS (
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'storage' 
            AND table_name = 'objects'
        ) THEN
            RAISE NOTICE 'Warning: storage.objects table does not exist.';
            RAISE NOTICE 'Storage needs to be initialized in Supabase Dashboard.';
        ELSE
            RAISE NOTICE 'storage.objects table exists.';
        END IF;
        
        -- Check if storage.buckets table exists
        IF NOT EXISTS (
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'storage' 
            AND table_name = 'buckets'
        ) THEN
            RAISE NOTICE 'Warning: storage.buckets table does not exist.';
        ELSE
            RAISE NOTICE 'storage.buckets table exists.';
            
            -- Check if profile-images bucket exists
            IF NOT EXISTS (
                SELECT 1 
                FROM storage.buckets 
                WHERE name = 'profile-images'
            ) THEN
                -- Create the bucket
                INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
                VALUES (
                    'profile-images',
                    'profile-images',
                    true,
                    10485760, -- 10MB
                    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
                )
                ON CONFLICT (id) DO NOTHING;
                
                RAISE NOTICE 'Created profile-images bucket.';
            ELSE
                RAISE NOTICE 'profile-images bucket already exists.';
            END IF;
        END IF;
    END IF;
END $$;

-- Create RPC function to check storage status (for frontend use)
CREATE OR REPLACE FUNCTION check_storage_exists()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    storage_exists boolean := false;
    objects_exists boolean := false;
    buckets_exists boolean := false;
    bucket_exists boolean := false;
BEGIN
    -- Check storage schema
    SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'storage'
    ) INTO storage_exists;
    
    IF storage_exists THEN
        -- Check storage.objects table
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'storage' AND table_name = 'objects'
        ) INTO objects_exists;
        
        -- Check storage.buckets table
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'storage' AND table_name = 'buckets'
        ) INTO buckets_exists;
        
        -- Check profile-images bucket
        IF buckets_exists THEN
            SELECT EXISTS (
                SELECT 1 FROM storage.buckets 
                WHERE name = 'profile-images'
            ) INTO bucket_exists;
        END IF;
    END IF;
    
    RETURN json_build_object(
        'storage_schema_exists', storage_exists,
        'storage_objects_exists', objects_exists,
        'storage_buckets_exists', buckets_exists,
        'profile_images_bucket_exists', bucket_exists,
        'ready', storage_exists AND objects_exists AND buckets_exists
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_storage_exists() TO authenticated;

-- Add RLS policies for profile-images bucket (if storage is initialized)
DO $$
BEGIN
    -- Only try to create policies if storage schema exists
    IF EXISTS (
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'storage'
    ) AND EXISTS (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'storage' 
        AND table_name = 'objects'
    ) THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
        DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
        DROP POLICY IF EXISTS "Profile images are publicly viewable" ON storage.objects;
        DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;
        
        -- Allow users to upload their own profile images
        CREATE POLICY "Users can upload their own profile images"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'profile-images' AND
            (auth.uid())::text = (storage.foldername(name))[1]
        );
        
        -- Allow users to update their own profile images
        CREATE POLICY "Users can update their own profile images"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
            bucket_id = 'profile-images' AND
            (auth.uid())::text = (storage.foldername(name))[1]
        );
        
        -- Allow public viewing of profile images
        CREATE POLICY "Profile images are publicly viewable"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'profile-images');
        
        -- Allow users to delete their own profile images
        CREATE POLICY "Users can delete their own profile images"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'profile-images' AND
            (auth.uid())::text = (storage.foldername(name))[1]
        );
        
        RAISE NOTICE 'Storage RLS policies created successfully.';
    ELSE
        RAISE NOTICE 'Storage not initialized. Skipping RLS policies.';
    END IF;
END $$;

-- Output final status
DO $$
DECLARE
    status json;
BEGIN
    SELECT check_storage_exists() INTO status;
    RAISE NOTICE 'Storage Status: %', status;
    
    IF NOT (status->>'ready')::boolean THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  IMPORTANT: Storage is not properly initialized!';
        RAISE NOTICE '📝 To fix this:';
        RAISE NOTICE '   1. Go to: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/storage/buckets';
        RAISE NOTICE '   2. Look for a "Set up Storage" or "Initialize Storage" button';
        RAISE NOTICE '   3. Click it to initialize storage';
        RAISE NOTICE '   4. Then re-run this migration';
    ELSE
        RAISE NOTICE '✅ Storage is ready for profile photo uploads!';
    END IF;
END $$;