-- Clear PAM conversation history for specific user
-- Use this if a user reports PAM tool execution issues

-- Check conversation records for user
SELECT
    id,
    user_id,
    session_id,
    created_at,
    updated_at
FROM pam_conversation_memory
WHERE user_id = '21a2151a-cd37-41d5-a1c7-124bb05e7a6a';

-- Clear all conversation history for specific user
DELETE FROM pam_conversation_memory
WHERE user_id = '21a2151a-cd37-41d5-a1c7-124bb05e7a6a';

-- Clear specific conversation session
DELETE FROM pam_conversation_memory
WHERE user_id = '21a2151a-cd37-41d5-a1c7-124bb05e7a6a'
  AND session_id = 'your-session-id-here';

-- Verify deletion
SELECT COUNT(*) as remaining_records
FROM pam_conversation_memory
WHERE user_id = '21a2151a-cd37-41d5-a1c7-124bb05e7a6a';
