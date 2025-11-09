-- ============================================================================
-- COMPREHENSIVE FIX: Add admin role to ALL transition module tables
-- ============================================================================
-- Problem: User has JWT role "admin" but ALL transition tables only have
--          RLS policies for "authenticated" and "anon" roles
-- Solution: Grant admin access to ALL transition-related tables
-- ============================================================================

-- GRANT ALL PRIVILEGES to admin role for all transition tables
GRANT ALL PRIVILEGES ON transition_profiles TO admin;
GRANT ALL PRIVILEGES ON transition_tasks TO admin;
GRANT ALL PRIVILEGES ON transition_timeline TO admin;
GRANT ALL PRIVILEGES ON transition_financial TO admin;
GRANT ALL PRIVILEGES ON transition_equipment TO admin;
GRANT ALL PRIVILEGES ON transition_vehicle_mods TO admin;
GRANT ALL PRIVILEGES ON shakedown_trips TO admin;
GRANT ALL PRIVILEGES ON shakedown_issues TO admin;
GRANT ALL PRIVILEGES ON mood_check_ins TO admin;
GRANT ALL PRIVILEGES ON anxiety_logs TO admin;
GRANT ALL PRIVILEGES ON partner_expectations TO admin;
GRANT ALL PRIVILEGES ON bailout_plans TO admin;
GRANT ALL PRIVILEGES ON user_launch_dates TO admin;
GRANT ALL PRIVILEGES ON launch_week_tasks TO admin;
GRANT ALL PRIVILEGES ON user_launch_tasks TO admin;
GRANT ALL PRIVILEGES ON launch_checkins TO admin;
GRANT ALL PRIVILEGES ON user_tags TO admin;

-- Add admin-specific RLS policies (bypass user_id checks for admins)

-- transition_profiles (already created, but including here for completeness)
DROP POLICY IF EXISTS "Admins can manage all transition profiles" ON transition_profiles;
CREATE POLICY "Admins can manage all transition profiles"
ON transition_profiles FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- transition_tasks
DROP POLICY IF EXISTS "Admins can manage all transition tasks" ON transition_tasks;
CREATE POLICY "Admins can manage all transition tasks"
ON transition_tasks FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- transition_timeline
DROP POLICY IF EXISTS "Admins can manage all transition timeline" ON transition_timeline;
CREATE POLICY "Admins can manage all transition timeline"
ON transition_timeline FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- transition_financial
DROP POLICY IF EXISTS "Admins can manage all transition financial" ON transition_financial;
CREATE POLICY "Admins can manage all transition financial"
ON transition_financial FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- transition_equipment
DROP POLICY IF EXISTS "Admins can manage all transition equipment" ON transition_equipment;
CREATE POLICY "Admins can manage all transition equipment"
ON transition_equipment FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- transition_vehicle_mods
DROP POLICY IF EXISTS "Admins can manage all transition vehicle mods" ON transition_vehicle_mods;
CREATE POLICY "Admins can manage all transition vehicle mods"
ON transition_vehicle_mods FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- shakedown_trips
DROP POLICY IF EXISTS "Admins can manage all shakedown trips" ON shakedown_trips;
CREATE POLICY "Admins can manage all shakedown trips"
ON shakedown_trips FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- shakedown_issues
DROP POLICY IF EXISTS "Admins can manage all shakedown issues" ON shakedown_issues;
CREATE POLICY "Admins can manage all shakedown issues"
ON shakedown_issues FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- mood_check_ins
DROP POLICY IF EXISTS "Admins can manage all mood check-ins" ON mood_check_ins;
CREATE POLICY "Admins can manage all mood check-ins"
ON mood_check_ins FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- anxiety_logs
DROP POLICY IF EXISTS "Admins can manage all anxiety logs" ON anxiety_logs;
CREATE POLICY "Admins can manage all anxiety logs"
ON anxiety_logs FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- partner_expectations
DROP POLICY IF EXISTS "Admins can manage all partner expectations" ON partner_expectations;
CREATE POLICY "Admins can manage all partner expectations"
ON partner_expectations FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- bailout_plans
DROP POLICY IF EXISTS "Admins can manage all bailout plans" ON bailout_plans;
CREATE POLICY "Admins can manage all bailout plans"
ON bailout_plans FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- user_launch_dates
DROP POLICY IF EXISTS "Admins can manage all user launch dates" ON user_launch_dates;
CREATE POLICY "Admins can manage all user launch dates"
ON user_launch_dates FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- launch_week_tasks
DROP POLICY IF EXISTS "Admins can manage all launch week tasks" ON launch_week_tasks;
CREATE POLICY "Admins can manage all launch week tasks"
ON launch_week_tasks FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- user_launch_tasks
DROP POLICY IF EXISTS "Admins can manage all user launch tasks" ON user_launch_tasks;
CREATE POLICY "Admins can manage all user launch tasks"
ON user_launch_tasks FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- launch_checkins
DROP POLICY IF EXISTS "Admins can manage all launch checkins" ON launch_checkins;
CREATE POLICY "Admins can manage all launch checkins"
ON launch_checkins FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- user_tags
DROP POLICY IF EXISTS "Admins can manage all user tags" ON user_tags;
CREATE POLICY "Admins can manage all user tags"
ON user_tags FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- ============================================================================
-- VERIFICATION: Run this to confirm all tables now support admin role
-- ============================================================================
SELECT
    table_name,
    grantee,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN (
    'transition_profiles', 'transition_tasks', 'transition_timeline',
    'transition_financial', 'transition_equipment', 'transition_vehicle_mods',
    'shakedown_trips', 'shakedown_issues', 'mood_check_ins', 'anxiety_logs',
    'partner_expectations', 'bailout_plans', 'user_launch_dates',
    'launch_week_tasks', 'user_launch_tasks', 'launch_checkins', 'user_tags'
)
AND grantee = 'admin'
GROUP BY table_name, grantee
ORDER BY table_name;
-- Expected: 17 rows, all showing admin with full privileges

-- ============================================================================
-- CRITICAL: After running this SQL, you MUST:
-- 1. Log out of the application completely
-- 2. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
-- 3. Log back in (to get fresh JWT token with new admin permissions)
-- 4. All 403 errors should be gone!
-- ============================================================================
