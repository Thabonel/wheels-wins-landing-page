-- Fix RLS Permissions Migration
-- Date: January 9, 2025
-- Purpose: Fix database permission errors for staging environment

-- Fix income_entries table permissions
DROP POLICY IF EXISTS "income_entries_policy" ON income_entries;
DROP POLICY IF EXISTS "Users can view their own income entries" ON income_entries;
DROP POLICY IF EXISTS "Users can insert their own income entries" ON income_entries;
DROP POLICY IF EXISTS "Users can update their own income entries" ON income_entries;
DROP POLICY IF EXISTS "Users can delete their own income entries" ON income_entries;

-- Enable RLS
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for income_entries
CREATE POLICY "income_entries_select" ON income_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "income_entries_insert" ON income_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "income_entries_update" ON income_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "income_entries_delete" ON income_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Fix expense_entries table permissions (preventive)
DROP POLICY IF EXISTS "expense_entries_policy" ON expense_entries;
DROP POLICY IF EXISTS "Users can view their own expense entries" ON expense_entries;
DROP POLICY IF EXISTS "Users can insert their own expense entries" ON expense_entries;
DROP POLICY IF EXISTS "Users can update their own expense entries" ON expense_entries;
DROP POLICY IF EXISTS "Users can delete their own expense entries" ON expense_entries;

ALTER TABLE expense_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_entries_select" ON expense_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "expense_entries_insert" ON expense_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expense_entries_update" ON expense_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expense_entries_delete" ON expense_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Fix budget_entries table permissions (preventive)
DROP POLICY IF EXISTS "budget_entries_policy" ON budget_entries;
DROP POLICY IF EXISTS "Users can view their own budget entries" ON budget_entries;
DROP POLICY IF EXISTS "Users can insert their own budget entries" ON budget_entries;
DROP POLICY IF EXISTS "Users can update their own budget entries" ON budget_entries;
DROP POLICY IF EXISTS "Users can delete their own budget entries" ON budget_entries;

ALTER TABLE budget_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_entries_select" ON budget_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "budget_entries_insert" ON budget_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budget_entries_update" ON budget_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budget_entries_delete" ON budget_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Fix user_settings table permissions
DROP POLICY IF EXISTS "user_settings_policy" ON user_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_delete" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_income_entries_user_id ON income_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_entries_user_id ON expense_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_entries_user_id ON budget_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON income_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON expense_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON budget_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO authenticated;

-- Grant usage on sequences (if they exist)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON POLICY "income_entries_select" ON income_entries IS 'Users can view their own income entries';
COMMENT ON POLICY "income_entries_insert" ON income_entries IS 'Users can insert their own income entries';
COMMENT ON POLICY "income_entries_update" ON income_entries IS 'Users can update their own income entries';
COMMENT ON POLICY "income_entries_delete" ON income_entries IS 'Users can delete their own income entries';

COMMENT ON POLICY "expense_entries_select" ON expense_entries IS 'Users can view their own expense entries';
COMMENT ON POLICY "expense_entries_insert" ON expense_entries IS 'Users can insert their own expense entries';
COMMENT ON POLICY "expense_entries_update" ON expense_entries IS 'Users can update their own expense entries';
COMMENT ON POLICY "expense_entries_delete" ON expense_entries IS 'Users can delete their own expense entries';

COMMENT ON POLICY "budget_entries_select" ON budget_entries IS 'Users can view their own budget entries';
COMMENT ON POLICY "budget_entries_insert" ON budget_entries IS 'Users can insert their own budget entries';
COMMENT ON POLICY "budget_entries_update" ON budget_entries IS 'Users can update their own budget entries';
COMMENT ON POLICY "budget_entries_delete" ON budget_entries IS 'Users can delete their own budget entries';

COMMENT ON POLICY "user_settings_select" ON user_settings IS 'Users can view their own settings';
COMMENT ON POLICY "user_settings_insert" ON user_settings IS 'Users can insert their own settings';
COMMENT ON POLICY "user_settings_update" ON user_settings IS 'Users can update their own settings';
COMMENT ON POLICY "user_settings_delete" ON user_settings IS 'Users can delete their own settings';