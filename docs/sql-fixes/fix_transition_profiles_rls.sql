-- Fix RLS policies for transition_profiles table
-- Run this in Supabase SQL Editor if you're getting 403 errors

-- Enable RLS on transition_profiles table
ALTER TABLE transition_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make this script idempotent)
DROP POLICY IF EXISTS "Users can view their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can create their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can update their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can delete their own transition profile" ON transition_profiles;

-- Create RLS policies
CREATE POLICY "Users can view their own transition profile"
ON transition_profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own transition profile"
ON transition_profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transition profile"
ON transition_profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own transition profile"
ON transition_profiles FOR DELETE
USING (user_id = auth.uid());
