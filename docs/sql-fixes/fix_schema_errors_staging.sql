-- Fix schema errors preventing profile access
-- Date: November 15, 2025
-- Purpose: Fix missing columns in user_settings and pam_savings_events

-- Check if user_settings table uses 'user_id' or 'id'
-- If it uses 'id', we need to update the backend query
-- First, let's see the current structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_settings';

-- Check pam_savings_events structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pam_savings_events';
