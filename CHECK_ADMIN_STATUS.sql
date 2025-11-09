-- Check your current user's admin status
-- Run this in Supabase SQL Editor while logged into the admin dashboard

SELECT
  id,
  email,
  raw_user_meta_data->>'is_admin' as is_admin_flag,
  created_at,
  CASE
    WHEN email LIKE '%@wheelsandwins.%' THEN 'YES - Domain Match'
    WHEN email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') THEN 'YES - Explicit Email'
    WHEN (raw_user_meta_data->>'is_admin')::boolean = true THEN 'YES - Admin Flag'
    ELSE 'NO - Not Admin'
  END as admin_access
FROM auth.users
WHERE id = auth.uid();  -- This gets YOUR current user ID

-- If the above returns nothing, try this to see all users:
-- SELECT id, email, raw_user_meta_data->>'is_admin' as is_admin
-- FROM auth.users
-- ORDER BY created_at DESC
-- LIMIT 10;
