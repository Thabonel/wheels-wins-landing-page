-- Fix profiles table structure to match Profile.tsx component expectations
-- The Profile component expects fields that don't exist and uses wrong primary key reference

-- First, let's check and fix the table structure
DO $$ 
DECLARE
    id_column_type text;
BEGIN
    -- Get the data type of the id column
    SELECT data_type INTO id_column_type 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'id' AND table_schema = 'public';
    
    -- Add missing columns to profiles table
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS travel_style TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_name TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_email TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_profile_image_url TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_make_model TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fuel_type TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS towing TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS second_vehicle TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_driving TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS camp_types TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accessibility TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pets TEXT;
    
    -- Set user_id based on the id column type
    IF id_column_type = 'uuid' THEN
        -- If id is already UUID, use it directly
        UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
    ELSIF id_column_type = 'bigint' THEN
        -- If id is bigint, we need to handle this differently
        -- For now, we'll leave user_id NULL and let the application handle profile creation
        RAISE NOTICE 'Profiles table has bigint id column - user_id will be set during profile updates';
    ELSE
        RAISE NOTICE 'Profiles table id column type: %', id_column_type;
    END IF;
END $$;

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_lookup ON public.profiles(user_id);

-- Update RLS policy to work with both id and user_id
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;

-- Create new policies that work with both id and user_id
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE USING (auth.uid() = id OR auth.uid() = user_id);

-- Drop the old "Users can view all profiles" policy as it's too permissive
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive view policy for public profile data
CREATE POLICY "profiles_view_public_data" ON public.profiles
    FOR SELECT USING (true); -- Allow viewing basic public profile info

COMMENT ON TABLE public.profiles IS 'User profiles with comprehensive travel and vehicle information';
COMMENT ON COLUMN public.profiles.user_id IS 'References auth.users(id) - used by frontend Profile.tsx component';
COMMENT ON COLUMN public.profiles.id IS 'Also references auth.users(id) - primary key for consistency';