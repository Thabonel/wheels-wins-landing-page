-- Add user_id column to user_settings table
-- Date: November 15, 2025
-- Purpose: Fix missing user_id column preventing user preferences loading

-- Add user_id column if it doesn't exist
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Verify the fix
SELECT
    COUNT(*) as total_settings,
    COUNT(user_id) as settings_with_user_id,
    COUNT(user_id) * 100.0 / NULLIF(COUNT(*), 0) as percentage_populated
FROM user_settings;

-- Show any settings missing user_id (need manual linking)
SELECT *
FROM user_settings
WHERE user_id IS NULL
LIMIT 5;
