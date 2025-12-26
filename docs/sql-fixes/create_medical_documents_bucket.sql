-- Create medical-documents storage bucket with proper RLS policies
-- This bucket stores user medical documents (PDFs, images, text files)
-- Each user can only access files in their own folder: {user_id}/*

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'medical-documents',
    'medical-documents',
    false,
    10485760,
    ARRAY['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own medical documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own medical documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own medical documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own medical documents" ON storage.objects;

-- CREATE POLICY: Users can upload files to their own folder
CREATE POLICY "Users can upload their own medical documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'medical-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- CREATE POLICY: Users can view files in their own folder
CREATE POLICY "Users can view their own medical documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'medical-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- CREATE POLICY: Users can update files in their own folder
CREATE POLICY "Users can update their own medical documents"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'medical-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
    bucket_id = 'medical-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- CREATE POLICY: Users can delete files in their own folder
CREATE POLICY "Users can delete their own medical documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'medical-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
);
