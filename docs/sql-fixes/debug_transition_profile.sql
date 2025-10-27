-- Debug: Check your transition profile status
-- Run this in Supabase SQL Editor to see why Transition link might not appear

-- Get your user ID first
SELECT
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'  -- Replace with your actual email
LIMIT 1;

-- Check if you have a transition profile
SELECT
  id,
  user_id,
  departure_date,
  current_phase,
  is_enabled,  -- Must be TRUE to show in nav
  auto_hide_after_departure,
  hide_days_after_departure,
  archived_at,
  created_at,
  updated_at
FROM transition_profiles
WHERE user_id = auth.uid();  -- Uses your current session

-- Check visibility logic
SELECT
  id,
  is_enabled,
  departure_date,
  auto_hide_after_departure,
  hide_days_after_departure,
  -- Calculate hide date
  CASE
    WHEN auto_hide_after_departure AND departure_date IS NOT NULL THEN
      departure_date + (hide_days_after_departure || ' days')::interval
    ELSE NULL
  END as hide_date,
  -- Check if we're past hide date
  CASE
    WHEN auto_hide_after_departure AND departure_date IS NOT NULL THEN
      NOW() > (departure_date + (hide_days_after_departure || ' days')::interval)
    ELSE false
  END as is_past_hide_date,
  -- Calculate days until departure
  CASE
    WHEN departure_date IS NOT NULL THEN
      EXTRACT(DAY FROM (departure_date - CURRENT_DATE))
    ELSE NULL
  END as days_until_departure,
  -- Final visibility decision
  CASE
    WHEN is_enabled = false THEN 'HIDDEN: Module disabled'
    WHEN auto_hide_after_departure AND departure_date IS NOT NULL
         AND NOW() > (departure_date + (hide_days_after_departure || ' days')::interval)
    THEN 'HIDDEN: Past hide date'
    ELSE 'VISIBLE: Should show in navigation'
  END as visibility_status
FROM transition_profiles
WHERE user_id = auth.uid();

-- If no rows returned above, create a default profile:
-- (Remove the -- to execute this)
-- INSERT INTO transition_profiles (
--   user_id,
--   departure_date,
--   current_phase,
--   transition_type,
--   is_enabled
-- ) VALUES (
--   auth.uid(),
--   CURRENT_DATE + interval '90 days',  -- 90 days from now
--   'planning',
--   'full_time',
--   true
-- );
