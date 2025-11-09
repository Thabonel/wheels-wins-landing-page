SELECT
  routine_name,
  routine_type,
  routine_schema,
  CASE
    WHEN routine_name = 'start_transition_profile' THEN '✅ Function exists'
    ELSE '❌ Function NOT found'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'start_transition_profile';
