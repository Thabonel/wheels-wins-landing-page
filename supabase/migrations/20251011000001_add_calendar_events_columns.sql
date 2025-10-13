ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

CREATE INDEX IF NOT EXISTS idx_calendar_events_all_day ON public.calendar_events(all_day);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON public.calendar_events(user_id, date);
