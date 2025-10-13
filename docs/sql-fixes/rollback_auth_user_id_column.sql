-- Rollback Script: Remove Accidentally Added auth_user_id Column
-- Execute this in Supabase SQL Editor to fix "bigint = uuid" error

-- Drop foreign key constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_auth_user_fk;

-- Drop index if it exists
DROP INDEX IF EXISTS idx_profiles_auth_user_id;

-- Drop the accidentally added column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS auth_user_id;

-- Verify profiles table structure (expected output)
-- id: uuid (references auth.users(id))
-- email: text
-- full_name: text
-- avatar_url: text
-- created_at: timestamp with time zone
-- updated_at: timestamp with time zone
