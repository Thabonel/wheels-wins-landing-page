-- Simple fix for calendar events permission issue
-- Remove all existing calendar_events policies and create clean ones

-- Drop all existing policies
DROP POLICY IF EXISTS "Users manage own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow authenticated users to insert calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow user to insert own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_select_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete_policy" ON public.calendar_events;

-- Create simple, working RLS policies
CREATE POLICY "calendar_select" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "calendar_insert" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calendar_update" ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calendar_delete" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- Ensure proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;