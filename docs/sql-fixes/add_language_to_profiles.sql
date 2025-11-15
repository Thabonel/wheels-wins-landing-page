-- Add language preference to profiles table
-- Date: November 15, 2025
-- Purpose: Store user's preferred language for PAM responses

-- Add language column with supported languages constraint
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en'
CHECK (language IN ('en', 'es', 'fr', 'de', 'pt', 'it'));

-- Add index for efficient language-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_language ON profiles(language);

-- Update existing users to default English (if column was just created)
UPDATE profiles SET language = 'en' WHERE language IS NULL;

-- Verify the change
SELECT COUNT(*) as total_users, language
FROM profiles
GROUP BY language
ORDER BY total_users DESC;
