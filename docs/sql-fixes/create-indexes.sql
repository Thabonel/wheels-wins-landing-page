CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_user_id_optimized ON expenses(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trips_user_id_optimized ON trips(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_conversations_user_id_optimized ON pam_conversations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_id_optimized ON posts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_settings_user_id_optimized ON user_settings(user_id) WHERE user_id IS NOT NULL;