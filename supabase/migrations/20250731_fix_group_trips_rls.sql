-- Fix infinite recursion in RLS policies for group_trips and group_trip_participants

-- Drop existing problematic policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view trips they're part of" ON public.group_trips;
DROP POLICY IF EXISTS "Users can create group trips" ON public.group_trips;
DROP POLICY IF EXISTS "Trip creators can update trips" ON public.group_trips;

DROP POLICY IF EXISTS "Users can view trip participants" ON public.group_trip_participants;
DROP POLICY IF EXISTS "Trip organizers can manage participants" ON public.group_trip_participants;


-- Create a security definer function to check if a user is a participant in a trip
-- This function will bypass RLS on group_trip_participants when called from an RLS policy.
CREATE OR REPLACE FUNCTION public.is_trip_participant(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANT: This makes the function run with the privileges of its creator (usually postgres), bypassing RLS on tables it queries.
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.group_trip_participants
        WHERE trip_id = p_trip_id AND user_id = p_user_id
    );
END;
$$;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_trip_participant(UUID, UUID) TO authenticated;


-- Recreate RLS Policies for group_trips
-- Policy 1: Creator can view their own trips
CREATE POLICY "Creator can view own trips" ON public.group_trips
    FOR SELECT USING (auth.uid() = created_by);

-- Policy 2: Participants can view trips they are part of (using the security definer function)
CREATE POLICY "Participants can view their trips" ON public.group_trips
    FOR SELECT USING (public.is_trip_participant(id, auth.uid()));

-- Policy 3: Users can create group trips
CREATE POLICY "Users can create group trips" ON public.group_trips
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Policy 4: Trip creators can update trips
CREATE POLICY "Trip creators can update trips" ON public.group_trips
    FOR UPDATE USING (auth.uid() = created_by);


-- Recreate RLS Policies for group_trip_participants
-- Policy 1: Users can view their own participant entry
CREATE POLICY "Users can view their own participant entry" ON public.group_trip_participants
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Organizers can view all participants of their trips
CREATE POLICY "Organizers can view all participants" ON public.group_trip_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.group_trips
            WHERE id = group_trip_participants.trip_id AND created_by = auth.uid()
        )
    );

-- Policy 3: Participants can view other participants in their shared trips
CREATE POLICY "Participants can view other participants in shared trips" ON public.group_trip_participants
    FOR SELECT USING (
        public.is_trip_participant(trip_id, auth.uid())
    );

-- Policy 4: Trip organizers can manage participants (INSERT, UPDATE, DELETE)
CREATE POLICY "Trip organizers can manage participants" ON public.group_trip_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM public.group_trips
            WHERE id = group_trip_participants.trip_id AND created_by = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.group_trips
            WHERE id = group_trip_participants.trip_id AND created_by = auth.uid()
        )
    );