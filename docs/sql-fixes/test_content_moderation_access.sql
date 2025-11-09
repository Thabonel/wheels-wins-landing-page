SELECT COUNT(*) as total_records FROM public.content_moderation;

SELECT * FROM public.content_moderation ORDER BY created_at DESC LIMIT 10;

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
