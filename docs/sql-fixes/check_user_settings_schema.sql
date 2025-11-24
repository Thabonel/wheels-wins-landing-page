-- Check user_settings table structure
-- Date: November 15, 2025
-- Purpose: Diagnose missing user_id column issue

-- See what columns user_settings currently has
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_settings'
ORDER BY ordinal_position;
