DROP TABLE IF EXISTS public.calendar_events CASCADE;

CREATE TABLE public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    event_type TEXT NOT NULL DEFAULT 'personal' CHECK (event_type IN ('personal', 'trip', 'maintenance', 'meeting', 'reminder', 'birthday', 'holiday')),
    location_name TEXT,
    reminder_minutes INTEGER[] DEFAULT ARRAY[15],
    color TEXT NOT NULL DEFAULT '#3b82f6',
    is_private BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT calendar_events_end_after_start CHECK (end_date >= start_date)
);

CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_date ON public.calendar_events(start_date);
CREATE INDEX idx_calendar_events_end_date ON public.calendar_events(end_date);
CREATE INDEX idx_calendar_events_event_type ON public.calendar_events(event_type);
CREATE INDEX idx_calendar_events_user_start ON public.calendar_events(user_id, start_date);
CREATE INDEX idx_calendar_events_user_type ON public.calendar_events(user_id, event_type);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_events_select_own ON public.calendar_events
    FOR SELECT USING (auth.uid() = user_id OR is_private = FALSE);

CREATE POLICY calendar_events_insert_own ON public.calendar_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY calendar_events_update_own ON public.calendar_events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY calendar_events_delete_own ON public.calendar_events
    FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_calendar_events_updated_at
    BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_events_updated_at();
