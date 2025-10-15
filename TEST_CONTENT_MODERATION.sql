-- Test Content Moderation Access and Data
-- Run this in Supabase SQL Editor to verify everything works

-- Step 1: Check if table exists and has any data
SELECT COUNT(*) as total_records FROM public.content_moderation;

-- Step 2: Check table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'content_moderation'
ORDER BY ordinal_position;

-- Step 3: See all records (if any)
SELECT * FROM public.content_moderation
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Insert a test record (to verify INSERT permission works)
INSERT INTO public.content_moderation (
  content_type,
  content_id,
  content_text,
  author_email,
  flagged_reason,
  status
) VALUES (
  'test_post',
  'test-' || gen_random_uuid()::text,
  'This is a test flagged content',
  'test@example.com',
  'Testing admin access',
  'pending'
) RETURNING *;

-- Step 5: Verify the test record was inserted
SELECT COUNT(*) as total_records_after_insert FROM public.content_moderation;

-- Step 6: Clean up test record (optional - remove the test data)
-- DELETE FROM public.content_moderation WHERE author_email = 'test@example.com';
