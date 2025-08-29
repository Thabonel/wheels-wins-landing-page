-- Fix calendar_events RLS policies to allow all operations for users on their own events

-- Drop existing incomplete policy
DROP POLICY IF EXISTS "events_insert" ON public.calendar_events;

-- Create comprehensive RLS policies for calendar_events
CREATE POLICY "calendar_events_select_policy" ON public.calendar_events 
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "calendar_events_insert_policy" ON public.calendar_events 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "calendar_events_update_policy" ON public.calendar_events 
  FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "calendar_events_delete_policy" ON public.calendar_events 
  FOR DELETE USING (auth.uid()::text = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;

COMMENT ON TABLE public.calendar_events IS 
'Calendar events table with proper RLS policies for users to manage their own events.';