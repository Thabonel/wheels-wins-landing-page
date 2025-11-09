SELECT
  auth.uid() as current_user_id,
  CASE
    WHEN auth.uid() IS NOT NULL THEN '✅ Authenticated'
    ELSE '❌ Not authenticated'
  END as auth_status,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as user_email;
