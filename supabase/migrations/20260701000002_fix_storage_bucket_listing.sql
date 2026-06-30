-- Security lint fix: Remove broad SELECT policies on public storage buckets.
-- Public buckets don't need listing permission for direct URL access.
-- Dropping the broad SELECT policy prevents anyone from enumerating all files.

-- === avatars ===
drop policy if exists "Anyone can view" on storage.objects;

-- === trip-images ===
drop policy if exists "Public can view trip images" on storage.objects;

-- === trip-template-images ===
drop policy if exists "Public Access for trip template images" on storage.objects;

-- Note: Individual file access via direct URLs still works without a SELECT policy.
-- If your app lists files from these buckets programmatically (e.g., via the Supabase
-- client with .list()), add back a narrower policy that limits listing to e.g.:
--   create policy "Authenticated can list own avatars"
--     on storage.objects for select to authenticated
--     using (auth.uid()::text = (storage.foldername(name))[1]);
