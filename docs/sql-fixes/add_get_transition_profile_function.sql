-- Add RPC function to fetch transition profile
-- This bypasses RLS and allows authenticated users to read their own profile

CREATE OR REPLACE FUNCTION public.get_transition_profile()
RETURNS public.transition_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_profile public.transition_profiles;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'get_transition_profile requires an authenticated user'
            USING errcode = 'P0001';
    END IF;

    SELECT * INTO v_profile
    FROM public.transition_profiles
    WHERE user_id = v_user_id;

    RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_transition_profile() TO authenticated;
