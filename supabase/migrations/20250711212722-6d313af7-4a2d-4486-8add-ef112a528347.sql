-- Enable realtime for calendar_events table
ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;