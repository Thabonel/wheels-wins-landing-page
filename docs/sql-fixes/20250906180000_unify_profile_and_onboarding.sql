-- Migration: Unify Profile and Onboarding Systems
-- This fixes the fundamental architectural flaw where onboarding data and profiles are disconnected
-- Onboarding data should populate and become the user profile, not exist as separate systems

BEGIN;

-- First, add all onboarding fields to the profiles table
-- This creates a single source of truth for user information

-- Core onboarding fields missing from profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region TEXT;

-- Vehicle Information (core to RV app)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS make_model_year TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fuel_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS towing_info TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS second_vehicle TEXT;

-- Travel Preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS travel_style TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_drive_limit TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_camp_types TEXT[];

-- Personal Information
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_info TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accessibility_needs TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_range TEXT;

-- Enhanced RV-specific fields for better PAM integration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_length_feet DECIMAL(4,1);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_height_feet DECIMAL(4,1);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_weight_kg INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fuel_efficiency_l_100km DECIMAL(4,1);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS water_capacity_liters INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grey_water_capacity_liters INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS solar_panels BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS generator BOOLEAN DEFAULT FALSE;

-- Onboarding completion tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Migrate existing onboarding data to profiles table if onboarding_responses exists
DO $$
BEGIN
    -- Check if onboarding_responses table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_responses') THEN
        -- Migrate data from onboarding_responses to profiles
        INSERT INTO profiles (
            id, email, full_name, nickname, region,
            vehicle_type, make_model_year, fuel_type, towing_info, second_vehicle,
            travel_style, daily_drive_limit, preferred_camp_types,
            pet_info, accessibility_needs, age_range,
            onboarding_completed, onboarding_completed_at,
            created_at, updated_at
        )
        SELECT DISTINCT ON (o.email)
            COALESCE(auth_users.id, gen_random_uuid()), -- Use auth user ID if exists, otherwise generate
            o.email,
            o.full_name,
            o.nickname,
            o.region,
            o.vehicle_type,
            o.make_model_year,
            o.fuel_type,
            o.towing_info,
            o.second_vehicle,
            o.travel_style,
            o.daily_drive_limit,
            CASE 
                WHEN o.preferred_camp_types IS NOT NULL 
                THEN string_to_array(o.preferred_camp_types, ',')
                ELSE ARRAY[]::TEXT[]
            END,
            o.pet_info,
            CASE 
                WHEN o.accessibility_needs IS NOT NULL 
                THEN string_to_array(o.accessibility_needs, ',')
                ELSE ARRAY[]::TEXT[]
            END,
            o.age_range,
            TRUE, -- onboarding completed
            o.created_at,
            o.created_at,
            o.updated_at
        FROM onboarding_responses o
        LEFT JOIN auth.users auth_users ON auth_users.email = o.email
        WHERE NOT EXISTS (
            SELECT 1 FROM profiles p WHERE p.email = o.email
        )
        ON CONFLICT (id) DO UPDATE SET
            nickname = EXCLUDED.nickname,
            region = EXCLUDED.region,
            vehicle_type = EXCLUDED.vehicle_type,
            make_model_year = EXCLUDED.make_model_year,
            fuel_type = EXCLUDED.fuel_type,
            towing_info = EXCLUDED.towing_info,
            second_vehicle = EXCLUDED.second_vehicle,
            travel_style = EXCLUDED.travel_style,
            daily_drive_limit = EXCLUDED.daily_drive_limit,
            preferred_camp_types = EXCLUDED.preferred_camp_types,
            pet_info = EXCLUDED.pet_info,
            accessibility_needs = EXCLUDED.accessibility_needs,
            age_range = EXCLUDED.age_range,
            onboarding_completed = TRUE,
            onboarding_completed_at = EXCLUDED.onboarding_completed_at,
            updated_at = NOW();
    END IF;
END $$;

-- Create indexes for performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_profiles_vehicle_type ON profiles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_profiles_region ON profiles(region);
CREATE INDEX IF NOT EXISTS idx_profiles_travel_style ON profiles(travel_style);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);

-- Update RLS policies to ensure new fields are accessible
-- The existing policies should cover the new columns automatically

-- Create a function to extract vehicle specifications for PAM
CREATE OR REPLACE FUNCTION get_user_vehicle_specs(user_id UUID)
RETURNS TABLE(
    vehicle_type TEXT,
    make_model_year TEXT,
    fuel_type TEXT,
    vehicle_length_feet DECIMAL,
    vehicle_height_feet DECIMAL,
    vehicle_weight_kg INTEGER,
    fuel_efficiency_l_100km DECIMAL,
    water_capacity_liters INTEGER,
    grey_water_capacity_liters INTEGER,
    solar_panels BOOLEAN,
    generator BOOLEAN,
    towing_info TEXT,
    second_vehicle TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.vehicle_type,
        p.make_model_year,
        p.fuel_type,
        p.vehicle_length_feet,
        p.vehicle_height_feet,
        p.vehicle_weight_kg,
        p.fuel_efficiency_l_100km,
        p.water_capacity_liters,
        p.grey_water_capacity_liters,
        p.solar_panels,
        p.generator,
        p.towing_info,
        p.second_vehicle
    FROM profiles p
    WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_vehicle_specs(UUID) TO authenticated;

-- Create a function to get complete user travel context for PAM
CREATE OR REPLACE FUNCTION get_user_travel_context(user_id UUID)
RETURNS TABLE(
    full_name TEXT,
    nickname TEXT,
    region TEXT,
    travel_style TEXT,
    daily_drive_limit TEXT,
    preferred_camp_types TEXT[],
    pet_info TEXT,
    accessibility_needs TEXT[],
    vehicle_type TEXT,
    make_model_year TEXT,
    fuel_type TEXT,
    is_rv_traveler BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.full_name,
        p.nickname,
        p.region,
        p.travel_style,
        p.daily_drive_limit,
        p.preferred_camp_types,
        p.pet_info,
        p.accessibility_needs,
        p.vehicle_type,
        p.make_model_year,
        p.fuel_type,
        CASE 
            WHEN p.vehicle_type IN ('motorhome', 'caravan', 'travel_trailer', 'fifth_wheel', 'truck_camper', 'van', 'unimog')
            THEN TRUE
            ELSE FALSE
        END as is_rv_traveler
    FROM profiles p
    WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_travel_context(UUID) TO authenticated;

-- Add comment explaining the unified approach
COMMENT ON TABLE profiles IS 'Unified user profile table containing both basic profile info and comprehensive onboarding data. This is the single source of truth for all user information that PAM uses for personalization.';

COMMIT;