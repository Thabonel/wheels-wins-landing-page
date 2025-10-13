CREATE INDEX IF NOT EXISTS idx_pam_conversations_user_created
ON pam_conversations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date
ON expenses(user_id, date);

CREATE INDEX IF NOT EXISTS idx_user_settings_user
ON user_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_pam_messages_conversation
ON pam_messages(conversation_id, created_at);

ANALYZE pam_conversations;
ANALYZE expenses;
ANALYZE user_settings;
ANALYZE pam_messages;
