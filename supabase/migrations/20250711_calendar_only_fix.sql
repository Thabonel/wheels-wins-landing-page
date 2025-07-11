-- Calendar events permission fix - minimal approach
-- Only touch calendar_events table, avoid admin system completely

-- Ensure calendar_events table exists
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  date date NOT NULL,
  time time without time zone,
  start_time time without time zone,
  end_time time without time zone,
  timezone text DEFAULT 'UTC',
  type text,
  location text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop existing calendar policies only
DO $$ 
BEGIN
  -- Drop policies that might exist
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
  DROP POLICY IF EXISTS "calendar_select" ON public.calendar_events;
  DROP POLICY IF EXISTS "calendar_insert" ON public.calendar_events;
  DROP POLICY IF EXISTS "calendar_update" ON public.calendar_events;
  DROP POLICY IF EXISTS "calendar_delete" ON public.calendar_events;
EXCEPTION
  WHEN undefined_table THEN
    NULL; -- Ignore if table doesn't exist
  WHEN undefined_object THEN 
    NULL; -- Ignore if policy doesn't exist
END $$;

-- Create new simple policies
CREATE POLICY "cal_select" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cal_insert" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cal_update" ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cal_delete" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;