CREATE INDEX IF NOT EXISTS idx_posts_user_trip ON posts(user_id, trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_income_entries_recurring ON income_entries(user_id, is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_user_wishlists_completed ON user_wishlists(user_id, is_completed) WHERE is_completed = false;
CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(user_id, end_date) WHERE end_date >= CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_pam_conversations_conversation_id ON pam_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pam_feedback_conversation_id ON pam_feedback(conversation_id);