-- Add category and current_page columns to support_tickets table
-- Run this in Supabase SQL Editor

-- Check if columns exist before adding
DO $$
BEGIN
    -- Add category column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'support_tickets' AND column_name = 'category'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN category TEXT DEFAULT 'bug';
    END IF;

    -- Add current_page column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'support_tickets' AND column_name = 'current_page'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN current_page TEXT DEFAULT '/';
    END IF;
END $$;

-- Add check constraint for category values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'support_tickets_category_check'
    ) THEN
        ALTER TABLE support_tickets
        ADD CONSTRAINT support_tickets_category_check
        CHECK (category IN ('bug', 'feature_request', 'question'));
    END IF;
END $$;
