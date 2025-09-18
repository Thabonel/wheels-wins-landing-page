-- Performance optimization indexes for production deployment
-- These indexes will significantly improve query performance across the application

-- User-related performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id_active ON profiles(user_id) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at DESC);

-- Expense tracking performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_category_user ON expenses(category, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_amount_date ON expenses(amount, date) WHERE amount > 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_tags ON expenses USING gin(tags);

-- Budget performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, period_start, period_end);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budgets_category_active ON budgets(category) WHERE is_active = true;

-- Trip template performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_templates_public ON trip_templates(is_public) WHERE is_public = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_templates_category ON trip_templates(category) WHERE is_public = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_templates_region ON trip_templates USING gin(template_data) WHERE is_public = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_templates_rating ON trip_templates(average_rating DESC NULLS LAST) WHERE is_public = true;

-- PAM conversation performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_conversations_user_created ON pam_conversations(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_conversations_active ON pam_conversations(is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_messages_conversation_timestamp ON pam_messages(conversation_id, timestamp DESC);

-- Financial goals and savings performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_goals_user_active ON financial_goals(user_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_goals_target_date ON financial_goals(target_date) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_savings_challenges_user_active ON savings_challenges(user_id) WHERE is_active = true;

-- Vehicle and maintenance performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_user_active ON vehicles(user_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_maintenance_vehicle_date ON vehicle_maintenance(vehicle_id, maintenance_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fuel_logs_vehicle_date ON fuel_logs(vehicle_id, fill_date DESC);

-- Social features performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_posts_public_created ON social_posts(created_at DESC) WHERE is_public = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_posts_user_created ON social_posts(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_comments_post_created ON social_comments(post_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_likes_post_user ON social_likes(post_id, user_id);

-- Trip planning performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trips_user_start_date ON trips(user_id, start_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trips_status_user ON trips(status, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waypoints_trip_order ON waypoints(trip_id, order_index);

-- Income tracking performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_income_user_date ON income(user_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_income_source_user ON income(source, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_income_amount_date ON income(amount, date) WHERE amount > 0;

-- Notification performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Analytics and reporting performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_logs_user_date ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_logs_action_date ON user_activity_logs(action, created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_user_category_date ON expenses(user_id, category, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budgets_user_category_period ON budgets(user_id, category, period_start, period_end);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_templates_category_rating ON trip_templates(category, average_rating DESC NULLS LAST) WHERE is_public = true;

-- Partial indexes for frequently filtered data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_recent ON expenses(user_id, date DESC) WHERE date >= CURRENT_DATE - INTERVAL '30 days';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_high_expenses ON expenses(user_id, amount DESC, date DESC) WHERE amount > 100;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_budgets_current_period ON budgets(user_id, category) WHERE is_active = true AND period_end >= CURRENT_DATE;

-- Text search indexes for better search performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_templates_name_search ON trip_templates USING gin(to_tsvector('english', name)) WHERE is_public = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_templates_description_search ON trip_templates USING gin(to_tsvector('english', description)) WHERE is_public = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_description_search ON expenses USING gin(to_tsvector('english', description));

-- Update table statistics for better query planning
ANALYZE profiles;
ANALYZE user_settings;
ANALYZE expenses;
ANALYZE budgets;
ANALYZE trip_templates;
ANALYZE pam_conversations;
ANALYZE pam_messages;
ANALYZE financial_goals;
ANALYZE vehicles;
ANALYZE trips;
ANALYZE income;
ANALYZE notifications;