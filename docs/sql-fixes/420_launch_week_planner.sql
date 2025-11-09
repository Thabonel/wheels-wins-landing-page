-- Launch Week Planner Database Schema
-- Supports day-by-day launch preparation and post-departure check-ins

-- Launch week task templates (system-defined)
CREATE TABLE IF NOT EXISTS launch_week_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INTEGER NOT NULL CHECK (day_number >= -7 AND day_number <= 0),
  task_name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  time_estimate_minutes INTEGER NOT NULL,
  order_num INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('legal', 'financial', 'vehicle', 'personal', 'communication', 'safety')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User's launch week task completion
CREATE TABLE IF NOT EXISTS user_launch_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES launch_week_tasks(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

-- Launch date tracking
CREATE TABLE IF NOT EXISTS user_launch_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  launch_date DATE NOT NULL,
  first_destination TEXT,
  emergency_contacts JSONB,
  celebration_plans TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Post-departure check-ins
CREATE TABLE IF NOT EXISTS launch_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_type TEXT NOT NULL CHECK (checkin_type IN ('day_1', 'week_1', 'month_1')),
  response TEXT NOT NULL,
  mood TEXT CHECK (mood IN ('excited', 'anxious', 'overwhelmed', 'confident', 'uncertain', 'hopeful', 'relieved', 'exhausted')),
  challenges TEXT,
  wins TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, checkin_type)
);

-- Indexes for performance
CREATE INDEX idx_launch_week_tasks_day ON launch_week_tasks(day_number, order_num);
CREATE INDEX idx_user_launch_tasks_user ON user_launch_tasks(user_id);
CREATE INDEX idx_user_launch_dates_user ON user_launch_dates(user_id);
CREATE INDEX idx_launch_checkins_user ON launch_checkins(user_id, checkin_type);

-- Function to get launch week progress
CREATE OR REPLACE FUNCTION get_launch_week_progress(p_user_id UUID)
RETURNS TABLE (
  day_number INTEGER,
  total_tasks INTEGER,
  completed_tasks INTEGER,
  critical_tasks INTEGER,
  critical_completed INTEGER,
  completion_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lwt.day_number,
    COUNT(lwt.id)::INTEGER as total_tasks,
    COUNT(CASE WHEN ult.is_completed THEN 1 END)::INTEGER as completed_tasks,
    COUNT(CASE WHEN lwt.is_critical THEN 1 END)::INTEGER as critical_tasks,
    COUNT(CASE WHEN lwt.is_critical AND ult.is_completed THEN 1 END)::INTEGER as critical_completed,
    CASE
      WHEN COUNT(lwt.id) > 0 THEN
        ROUND((COUNT(CASE WHEN ult.is_completed THEN 1 END)::DECIMAL / COUNT(lwt.id)::DECIMAL) * 100, 1)
      ELSE 0
    END as completion_percentage
  FROM launch_week_tasks lwt
  LEFT JOIN user_launch_tasks ult ON ult.task_id = lwt.id AND ult.user_id = p_user_id
  GROUP BY lwt.day_number
  ORDER BY lwt.day_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get days until launch
CREATE OR REPLACE FUNCTION get_days_until_launch(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_launch_date DATE;
BEGIN
  SELECT launch_date INTO v_launch_date
  FROM user_launch_dates
  WHERE user_id = p_user_id;

  IF v_launch_date IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (v_launch_date - CURRENT_DATE);
END;
$$ LANGUAGE plpgsql STABLE;

-- Insert default launch week tasks
-- Day -7 (One week before launch)
INSERT INTO launch_week_tasks (day_number, task_name, description, is_critical, time_estimate_minutes, order_num, category) VALUES
(-7, 'Final vehicle inspection', 'Complete mechanical inspection and address any issues', true, 120, 1, 'vehicle'),
(-7, 'Confirm insurance coverage', 'Verify full-time RV insurance is active', true, 30, 2, 'legal'),
(-7, 'Notify key contacts', 'Let family/friends know your departure plans', false, 20, 3, 'communication'),
(-7, 'Stock up on essentials', 'Buy non-perishable food, first aid, tools', false, 90, 4, 'personal'),
(-7, 'Create backup digital files', 'Scan important documents, backup photos/files', false, 45, 5, 'safety');

-- Day -6
INSERT INTO launch_week_tasks (day_number, task_name, description, is_critical, time_estimate_minutes, order_num, category) VALUES
(-6, 'Cancel/forward mail', 'Set up mail forwarding service', true, 30, 1, 'legal'),
(-6, 'Close or suspend utilities', 'Finalize utility arrangements for departure', true, 60, 2, 'financial'),
(-6, 'Pack kitchen essentials', 'Organize and pack kitchen items', false, 90, 3, 'personal'),
(-6, 'Test all RV systems', 'Water, electric, propane, heating/cooling', true, 60, 4, 'vehicle'),
(-6, 'Update GPS/maps', 'Download offline maps for first destination', false, 20, 5, 'safety');

-- Day -5
INSERT INTO launch_week_tasks (day_number, task_name, description, is_critical, time_estimate_minutes, order_num, category) VALUES
(-5, 'Final banking setup', 'Confirm online banking, travel notices, ATM access', true, 30, 1, 'financial'),
(-5, 'Pack clothing and bedding', 'Organize clothes for various climates', false, 120, 2, 'personal'),
(-5, 'Set up roadside assistance', 'Verify coverage and contact numbers', true, 20, 3, 'safety'),
(-5, 'Organize tools and repair kit', 'Ensure you have basic repair tools', false, 45, 4, 'vehicle'),
(-5, 'Plan first week route', 'Map out first few stops with backup options', false, 60, 5, 'safety');

-- Day -4
INSERT INTO launch_week_tasks (day_number, task_name, description, is_critical, time_estimate_minutes, order_num, category) VALUES
(-4, 'Weigh RV fully loaded', 'Verify weight distribution and towing capacity', true, 60, 1, 'vehicle'),
(-4, 'Pack personal items', 'Books, electronics, hobbies, work equipment', false, 90, 2, 'personal'),
(-4, 'Share itinerary with trusted person', 'Provide route plans and check-in schedule', true, 20, 3, 'safety'),
(-4, 'Stock medications and prescriptions', 'Ensure 3-month supply of any medications', true, 30, 4, 'personal'),
(-4, 'Test backup communication', 'Verify cell coverage, satellite phone if needed', false, 30, 5, 'communication');

-- Day -3
INSERT INTO launch_week_tasks (day_number, task_name, description, is_critical, time_estimate_minutes, order_num, category) VALUES
(-3, 'Deep clean RV interior', 'Start fresh with clean living space', false, 120, 1, 'personal'),
(-3, 'Secure all items for travel', 'Prevent items from shifting during drive', true, 60, 2, 'vehicle'),
(-3, 'Charge all devices', 'Phones, laptops, cameras, power banks', false, 15, 3, 'personal'),
(-3, 'Review emergency procedures', 'Fire safety, medical emergencies, breakdowns', true, 30, 4, 'safety'),
(-3, 'Say goodbye to local connections', 'Final meet-ups with friends/family', false, 180, 5, 'communication');

-- Day -2
INSERT INTO launch_week_tasks (day_number, task_name, description, is_critical, time_estimate_minutes, order_num, category) VALUES
(-2, 'Final shopping run', 'Fresh food, last-minute items', false, 90, 1, 'personal'),
(-2, 'Fill fuel tank', 'Start with full tank of gas/diesel', true, 20, 2, 'vehicle'),
(-2, 'Dump tanks and refill fresh water', 'Start journey with empty waste, full water', true, 30, 3, 'vehicle'),
(-2, 'Double-check all connections', 'Hoses, propane, electrical, hitch', true, 30, 4, 'vehicle'),
(-2, 'Rest and relax', 'Get good sleep, manage pre-departure nerves', false, 120, 5, 'personal');

-- Day -1
INSERT INTO launch_week_tasks (day_number, task_name, description, is_critical, time_estimate_minutes, order_num, category) VALUES
(-1, 'Final walkthrough of home/storage', 'Verify everything is secured', true, 60, 1, 'legal'),
(-1, 'Exterior vehicle inspection', 'Tires, lights, mirrors, hitch, slide-outs', true, 30, 2, 'vehicle'),
(-1, 'Pack day-of essentials', 'Snacks, drinks, entertainment for drive', false, 20, 3, 'personal'),
(-1, 'Set departure time alarm', 'Plan to leave early, avoid traffic', false, 5, 4, 'personal'),
(-1, 'Journal/reflect on moment', 'Capture feelings before big change', false, 30, 5, 'personal');

-- Day 0 (Launch Day!)
INSERT INTO launch_week_tasks (day_number, task_name, description, is_critical, time_estimate_minutes, order_num, category) VALUES
(0, 'Final safety check', 'Walk around, check for hazards, loose items', true, 15, 1, 'safety'),
(0, 'Take departure photo', 'Capture this moment!', false, 5, 2, 'personal'),
(0, 'Notify tracking person', 'Text/call to confirm departure', true, 5, 3, 'communication'),
(0, 'Start navigation system', 'Set route to first destination', true, 10, 4, 'vehicle'),
(0, 'Breathe and enjoy', 'You did it! Take a moment to appreciate this', false, 5, 5, 'personal')
ON CONFLICT DO NOTHING;
