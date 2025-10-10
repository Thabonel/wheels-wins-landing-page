-- Check if auth_user_id column exists in profiles
-- This column was accidentally added and might be causing the error

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;
