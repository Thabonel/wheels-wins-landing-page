SELECT
  id,
  email,
  role,
  created_at
FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at DESC;
