-- Psychological Support Tools Database Schema
-- Supports mood tracking, anxiety management, motivation, partner alignment, and bail-out planning

-- Daily mood check-ins
CREATE TABLE IF NOT EXISTS mood_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood TEXT NOT NULL CHECK (mood IN ('excited', 'anxious', 'overwhelmed', 'confident', 'uncertain', 'hopeful')),
  journal_entry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Anxiety tracking
CREATE TABLE IF NOT EXISTS anxiety_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fear_category TEXT NOT NULL CHECK (fear_category IN ('financial', 'relationships', 'safety', 'loneliness', 'uncertainty', 'failure', 'regret')),
  coping_strategy_used TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Milestone badges (system-defined)
CREATE TABLE IF NOT EXISTS milestone_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  criteria JSONB NOT NULL,
  order_num INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User earned badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES milestone_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Partner expectations
CREATE TABLE IF NOT EXISTS partner_expectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('budget', 'travel_pace', 'work_life', 'social', 'daily_routine', 'responsibilities', 'conflict_resolution')),
  expectation TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expectation discussions
CREATE TABLE IF NOT EXISTS expectation_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expectation_id UUID NOT NULL REFERENCES partner_expectations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bail-out plans (backup plans)
CREATE TABLE IF NOT EXISTS bailout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('financial', 'housing', 'employment', 'relationship', 'health', 'complete_return')),
  plan_details TEXT NOT NULL,
  trigger_conditions TEXT,
  resources_needed TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mood_check_ins_user ON mood_check_ins(user_id, date DESC);
CREATE INDEX idx_anxiety_logs_user ON anxiety_logs(user_id, created_at DESC);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_partner_expectations_user ON partner_expectations(user_id);
CREATE INDEX idx_partner_expectations_partner ON partner_expectations(partner_id);
CREATE INDEX idx_expectation_discussions_expectation ON expectation_discussions(expectation_id, created_at);
CREATE INDEX idx_bailout_plans_user ON bailout_plans(user_id);

-- Function to get mood trends for a user
CREATE OR REPLACE FUNCTION get_mood_trends(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  mood TEXT,
  has_journal BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mci.date,
    mci.mood,
    (mci.journal_entry IS NOT NULL AND length(mci.journal_entry) > 0) as has_journal
  FROM mood_check_ins mci
  WHERE mci.user_id = p_user_id
    AND mci.date >= CURRENT_DATE - p_days
  ORDER BY mci.date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check badge eligibility
CREATE OR REPLACE FUNCTION check_badge_eligibility(p_user_id UUID)
RETURNS TABLE (
  badge_id UUID,
  badge_name TEXT,
  badge_description TEXT,
  badge_icon TEXT,
  is_earned BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mb.id as badge_id,
    mb.name as badge_name,
    mb.description as badge_description,
    mb.icon as badge_icon,
    EXISTS(
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = p_user_id AND ub.badge_id = mb.id
    ) as is_earned
  FROM milestone_badges mb
  ORDER BY mb.order_num;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get partner alignment stats
CREATE OR REPLACE FUNCTION get_partner_alignment_stats(p_user_id UUID)
RETURNS TABLE (
  total_expectations INTEGER,
  discussed_expectations INTEGER,
  high_priority_count INTEGER,
  categories_covered INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT pe.id)::INTEGER as total_expectations,
    COUNT(DISTINCT CASE WHEN EXISTS(
      SELECT 1 FROM expectation_discussions ed WHERE ed.expectation_id = pe.id
    ) THEN pe.id END)::INTEGER as discussed_expectations,
    COUNT(DISTINCT CASE WHEN pe.priority = 'high' THEN pe.id END)::INTEGER as high_priority_count,
    COUNT(DISTINCT pe.category)::INTEGER as categories_covered
  FROM partner_expectations pe
  WHERE pe.user_id = p_user_id OR pe.partner_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Insert default milestone badges
INSERT INTO milestone_badges (name, description, icon, criteria, order_num) VALUES
('First Steps', 'Created your transition profile', '👟', '{"action": "profile_created"}', 1),
('Getting Organized', 'Added your first 10 tasks', '📋', '{"action": "tasks_created", "count": 10}', 2),
('Budget Master', 'Set up your first budget', '💰', '{"action": "budget_created"}', 3),
('Vehicle Ready', 'Completed vehicle modifications checklist', '🚐', '{"action": "vehicle_checklist_complete"}', 4),
('Test Drive', 'Completed your first shakedown trip', '🏕️', '{"action": "shakedown_trip_complete"}', 5),
('Reality Check', 'Acknowledged your feasibility score', '📊', '{"action": "reality_check_viewed"}', 6),
('Community Connected', 'Made your first community connection', '👥', '{"action": "first_connection"}', 7),
('Launch Week', 'Started your launch week countdown', '🚀', '{"action": "launch_week_started"}', 8),
('Departure Day', 'Marked departure day as complete', '🎉', '{"action": "departure_complete"}', 9),
('First Month', 'Completed your first month on the road', '🏆', '{"action": "first_month_complete"}', 10)
ON CONFLICT DO NOTHING;
