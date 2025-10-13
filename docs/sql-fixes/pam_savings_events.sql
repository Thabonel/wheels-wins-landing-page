CREATE TABLE IF NOT EXISTS pam_savings_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_saved DECIMAL(10,2) NOT NULL CHECK (amount_saved >= 0),
  category TEXT NOT NULL,
  description TEXT,
  event_type TEXT CHECK (event_type IN ('gas', 'campground', 'route', 'other')) DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_id ON pam_savings_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_created_at ON pam_savings_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_created ON pam_savings_events(user_id, created_at DESC);

ALTER TABLE pam_savings_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own savings events"
  ON pam_savings_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings events"
  ON pam_savings_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings events"
  ON pam_savings_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings events"
  ON pam_savings_events FOR DELETE
  USING (auth.uid() = user_id);
