-- Check what the admin policies actually reference
-- Run this to see if policies call is_admin() or use another method

SELECT
  policyname,
  cmd,
  qual as "USING clause",
  with_check as "WITH CHECK clause"
FROM pg_policies
WHERE tablename = 'affiliate_products'
  AND policyname LIKE 'admin%'
ORDER BY cmd, policyname;

-- This will show exactly what the policies check
-- Looking for: is_admin() function calls
