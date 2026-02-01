-- Create user_trips table for PAM trip editing workflow
-- Execute this in Supabase SQL Editor: https://kycoklimpzkyrecbjecn.supabase.co

-- First, ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the user_trips table
CREATE TABLE IF NOT EXISTS public.user_trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    total_budget DECIMAL(10,2),
    status TEXT NOT NULL DEFAULT 'planning'
        CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    trip_type TEXT,
    privacy_level TEXT NOT NULL DEFAULT 'private'
        CHECK (privacy_level IN ('private', 'shared', 'public')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON public.user_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trips_status ON public.user_trips(status);
CREATE INDEX IF NOT EXISTS idx_user_trips_created_at ON public.user_trips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_trips_updated_at ON public.user_trips(updated_at DESC);

-- Create GIN index on metadata for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_trips_metadata_gin ON public.user_trips USING gin(metadata);

-- Create specific index for PAM trips
CREATE INDEX IF NOT EXISTS idx_user_trips_pam
    ON public.user_trips USING gin((metadata->'created_by'));

-- Enable Row Level Security
ALTER TABLE public.user_trips ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own trips
DROP POLICY IF EXISTS "Users can view own trips" ON public.user_trips;
CREATE POLICY "Users can view own trips"
    ON public.user_trips FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own trips
DROP POLICY IF EXISTS "Users can insert own trips" ON public.user_trips;
CREATE POLICY "Users can insert own trips"
    ON public.user_trips FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own trips
DROP POLICY IF EXISTS "Users can update own trips" ON public.user_trips;
CREATE POLICY "Users can update own trips"
    ON public.user_trips FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own trips
DROP POLICY IF EXISTS "Users can delete own trips" ON public.user_trips;
CREATE POLICY "Users can delete own trips"
    ON public.user_trips FOR DELETE
    USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_trips_updated_at ON public.user_trips;
CREATE TRIGGER update_user_trips_updated_at
    BEFORE UPDATE ON public.user_trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.user_trips TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verify the table was created correctly
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_trips'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_trips';

COMMIT;