ALTER TABLE public.pam_savings_events ADD COLUMN IF NOT EXISTS saved_date DATE NOT NULL DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_date ON pam_savings_events(user_id, saved_date);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_category ON pam_savings_events(category);