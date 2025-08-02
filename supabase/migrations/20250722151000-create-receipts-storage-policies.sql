-- Create receipts storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,  -- Public read access
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for receipts bucket

-- Policy: Users can upload receipts to their own folder
CREATE POLICY "Users can upload their own receipts" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own receipts
CREATE POLICY "Users can update their own receipts" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own receipts
CREATE POLICY "Users can delete their own receipts" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view receipts (public bucket)
CREATE POLICY "Anyone can view receipts" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'receipts');