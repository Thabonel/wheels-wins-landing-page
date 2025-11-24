-- Fix pam_savings_events table - Add actual_savings column
-- Date: November 15, 2025
-- Purpose: Fix missing actual_savings column preventing savings summary queries

-- Add actual_savings column (backend expects this but table has 'amount')
ALTER TABLE pam_savings_events
ADD COLUMN IF NOT EXISTS actual_savings DECIMAL(10,2);

-- Migrate existing data from 'amount' column to 'actual_savings'
UPDATE pam_savings_events
SET actual_savings = amount
WHERE actual_savings IS NULL AND amount IS NOT NULL;

-- Make actual_savings NOT NULL and default to amount going forward
ALTER TABLE pam_savings_events
ALTER COLUMN actual_savings SET DEFAULT 0.00;

-- Add index for efficient savings queries
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_date
ON pam_savings_events(user_id, created_at DESC);

-- Verify the fix
SELECT
    COUNT(*) as total_events,
    COUNT(actual_savings) as events_with_actual_savings,
    COALESCE(SUM(actual_savings), 0) as total_savings,
    COUNT(amount) as events_with_amount
FROM pam_savings_events;
