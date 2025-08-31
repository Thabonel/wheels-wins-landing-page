-- COMPLETE STORAGE SETUP FOR SUPABASE
-- This migration ensures all storage components are properly initialized

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- 3. Grant permissions on storage schema
GRANT ALL ON SCHEMA storage TO postgres;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- 4. Create storage.buckets table if not exists
CREATE TABLE IF NOT EXISTS storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    CONSTRAINT buckets_pkey PRIMARY KEY (id),
    CONSTRAINT buckets_owner_fkey FOREIGN KEY (owner) REFERENCES auth.users(id)
);

-- 5. Create storage.objects table if not exists
CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_accessed_at timestamptz DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    CONSTRAINT objects_pkey PRIMARY KEY (id),
    CONSTRAINT objects_bucketid_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id),
    CONSTRAINT objects_owner_fkey FOREIGN KEY (owner) REFERENCES auth.users(id)
);

-- 6. Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS bucketid_objname ON storage.objects USING btree (bucket_id, name);
CREATE INDEX IF NOT EXISTS name_prefix_search ON storage.objects USING btree (name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_objects_bucket_id ON storage.objects USING btree (bucket_id);
CREATE INDEX IF NOT EXISTS idx_objects_owner ON storage.objects USING btree (owner);
CREATE INDEX IF NOT EXISTS idx_objects_created_at ON storage.objects USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_objects_updated_at ON storage.objects USING btree (updated_at);

-- 7. Create unique index on buckets
CREATE UNIQUE INDEX IF NOT EXISTS bname ON storage.buckets USING btree (name);

-- 8. Grant permissions on tables
GRANT ALL ON storage.buckets TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets TO anon, authenticated;
GRANT SELECT ON storage.buckets TO service_role;

GRANT ALL ON storage.objects TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.objects TO service_role;

-- 9. Enable RLS
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 10. Create or replace the profile-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-images',
    'profile-images',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[];

-- 11. Drop all existing policies for profile-images
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

-- 12. Create simple, permissive policies for profile-images
CREATE POLICY "Anyone can upload to profile-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Anyone can view profile-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "Anyone can update profile-images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'profile-images')
WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Anyone can delete from profile-images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'profile-images');

-- 13. Create storage functions if they don't exist
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE plpgsql
AS $function$
DECLARE
  _parts text[];
BEGIN
  SELECT string_to_array(name, '/') INTO _parts;
  RETURN _parts[1:array_length(_parts, 1)-1];
END
$function$;

CREATE OR REPLACE FUNCTION storage.filename(name text)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  _parts text[];
BEGIN
  SELECT string_to_array(name, '/') INTO _parts;
  RETURN _parts[array_length(_parts, 1)];
END
$function$;

CREATE OR REPLACE FUNCTION storage.extension(name text)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  _parts text[];
  _filename text;
BEGIN
  SELECT string_to_array(name, '/') INTO _parts;
  SELECT _parts[array_length(_parts, 1)] INTO _filename;
  SELECT string_to_array(_filename, '.') INTO _parts;
  RETURN _parts[array_length(_parts, 1)];
END
$function$;

-- 14. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION storage.foldername(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION storage.filename(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION storage.extension(text) TO anon, authenticated;