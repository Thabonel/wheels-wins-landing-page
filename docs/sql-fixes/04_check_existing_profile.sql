SELECT
  COUNT(*) as profile_count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ No existing profile'
    WHEN COUNT(*) = 1 THEN '⚠️  Profile exists'
    ELSE '❌ Multiple profiles (should be impossible)'
  END as status
FROM transition_profiles
WHERE user_id = auth.uid();

SELECT *
FROM transition_profiles
WHERE user_id = auth.uid();
