-- Fix for PAM conversation storage error
-- The session_id column is expecting UUID but getting 'default'

-- Option 1: Alter the column to accept text (recommended)
ALTER TABLE public.pam_conversations 
ALTER COLUMN session_id TYPE TEXT;

-- Option 2: Create a default UUID for 'default' sessions
-- This would require backend code changes to map 'default' to this UUID
-- DO $$
-- DECLARE
--   default_session_uuid UUID := '00000000-0000-0000-0000-000000000000';
-- BEGIN
--   -- Update any existing 'default' sessions if stored as text somewhere
--   -- This is just for reference, actual implementation depends on your schema
-- END $$;