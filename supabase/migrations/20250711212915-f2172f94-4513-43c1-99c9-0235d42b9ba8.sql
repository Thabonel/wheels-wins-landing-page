-- Fix RLS policies for calendar_events table to avoid admin role permission issues

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow authenticated users to insert calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow user to insert own events" ON public.calendar_events;

-- Create new, simple RLS policies that don't trigger admin role checks
CREATE POLICY "Users can view their own calendar events" 
ON public.calendar_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar events" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events" 
ON public.calendar_events 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events" 
ON public.calendar_events 
FOR DELETE 
USING (auth.uid() = user_id);