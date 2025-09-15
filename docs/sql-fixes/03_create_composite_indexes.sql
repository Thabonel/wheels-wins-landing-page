-- Create composite indexes for common query patterns
-- Run each statement separately in Supabase SQL Editor

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_created ON expenses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_date ON income_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_created ON income_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_user_start ON trips(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_user_created ON trips(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pam_conversations_user_created ON pam_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_created ON affiliate_sales(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_priority ON user_wishlists(user_id, priority DESC);