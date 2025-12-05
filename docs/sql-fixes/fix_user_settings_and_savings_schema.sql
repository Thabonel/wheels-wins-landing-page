-- Fix schema errors in user_settings and pam_savings_events tables
-- Date: November 15, 2025
-- Purpose: Fix missing columns preventing profile access in PAM

-- ============================================================================
-- Fix 1: user_settings table - Add user_id column if missing
-- ============================================================================

-- Check current structure first (run this separately to see what you have)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'user_settings'
-- ORDER BY ordinal_position;

-- If table uses 'id' instead of 'user_id', add user_id column
-- This handles the common pattern where profiles uses 'id' but other tables expect 'user_id'
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- If the table already has an 'id' column that IS the user reference,
-- copy those values to the new user_id column
UPDATE user_settings
SET user_id = id
WHERE user_id IS NULL AND id IS NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- ============================================================================
-- Fix 2: pam_savings_events table - Add actual_savings column
-- ============================================================================

-- Check current structure first (run this separately to see what you have)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'pam_savings_events'
-- ORDER BY ordinal_position;

-- Add actual_savings column if missing
-- This column tracks the actual dollar amount saved by PAM's recommendations
ALTER TABLE pam_savings_events
ADD COLUMN IF NOT EXISTS actual_savings DECIMAL(10,2);

-- If the table has amount_saved but not actual_savings, migrate the data
UPDATE pam_savings_events
SET actual_savings = amount_saved
WHERE actual_savings IS NULL AND amount_saved IS NOT NULL;

-- Add index for performance on common queries
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_id_date
ON pam_savings_events(user_id, created_at DESC);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify user_settings now has user_id column
SELECT
    COUNT(*) as total_settings,
    COUNT(user_id) as settings_with_user_id
FROM user_settings;

-- Verify pam_savings_events now has actual_savings column
SELECT
    COUNT(*) as total_savings_events,
    COUNT(actual_savings) as events_with_actual_savings,
    COALESCE(SUM(actual_savings), 0) as total_savings
FROM pam_savings_events;

-- Check if any user_settings records are missing user_id (should be 0)
SELECT COUNT(*) as orphaned_settings
FROM user_settings
WHERE user_id IS NULL;
