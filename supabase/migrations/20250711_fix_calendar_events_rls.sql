-- Fix RLS policies for calendar_events table
-- The issue was a type mismatch in the previous migration that tried to compare auth.uid()::text with uuid user_id
-- Also ensure the policies are completely independent from admin_users table to avoid circular dependencies

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users manage own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow authenticated users to insert calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow user to insert own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete their own calendar events" ON public.calendar_events;

-- Create simple, safe RLS policies that only check user ownership (no admin dependencies)
CREATE POLICY "calendar_events_select_policy" 
ON public.calendar_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "calendar_events_insert_policy" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendar_events_update_policy" 
ON public.calendar_events 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendar_events_delete_policy" 
ON public.calendar_events 
FOR DELETE 
USING (auth.uid() = user_id);

-- Ensure proper grants to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;

-- Also ensure the table is in the realtime publication if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'calendar_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
  END IF;
END $$;