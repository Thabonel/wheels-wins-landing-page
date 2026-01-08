-- Add Solo Traveler Community Profile Fields
-- Phase 1: Inclusive Foundation
-- Date: January 8, 2026
--
-- Purpose: Enable optional gender identity, pronouns, interests, and content preferences
-- for personalized community features while maintaining privacy-first design.
--
-- Design Principles:
-- - All fields are OPTIONAL (never forced)
-- - Gender is HIDDEN by default (user opts in to share)
-- - Inclusive options (Woman, Man, Non-binary, Self-describe, etc.)
-- - Privacy-first (content_preferences defaults to all false)

-- ============================================================================
-- Step 1: Add Gender Identity & Pronouns (OPTIONAL)
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender_identity TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender_custom TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns_custom TEXT;

COMMENT ON COLUMN profiles.gender_identity IS
  'Optional gender identity. Options: Woman, Man, Non-binary, Genderqueer, Agender, Genderfluid, Two-Spirit, Self-describe, Prefer not to say. Hidden by default (user controls visibility via content_preferences).';

COMMENT ON COLUMN profiles.gender_custom IS
  'Custom gender identity text when user selects "Self-describe". Only used if gender_identity = ''Self-describe''.';

COMMENT ON COLUMN profiles.pronouns IS
  'Optional pronouns. Options: she/her, he/him, they/them, she/they, he/they, any, Self-describe, Prefer not to say. Visible by default for respectful communication (can be hidden in privacy settings).';

COMMENT ON COLUMN profiles.pronouns_custom IS
  'Custom pronouns text when user selects "Self-describe". Only used if pronouns = ''Self-describe''.';

-- ============================================================================
-- Step 2: Add Interests Array (for activity-based matching)
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT[];

COMMENT ON COLUMN profiles.interests IS
  'Array of interest tags for activity-based matching. Examples: hiking, fishing, photography, cycling, rv-repair, cooking, veterans. Used to recommend groups and events.';

-- ============================================================================
-- Step 3: Convert travel_style to TEXT[] (support multiple travel styles)
-- ============================================================================

-- Check if travel_style exists and is TEXT (not already array)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'travel_style'
    AND data_type = 'text'
  ) THEN
    -- Create temporary column for migration
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS travel_style_array TEXT[];

    -- Migrate existing data (convert solo/couple to array)
    UPDATE profiles
    SET travel_style_array = ARRAY[travel_style]
    WHERE travel_style IS NOT NULL AND travel_style != '';

    -- Drop old column and rename new one
    ALTER TABLE profiles DROP COLUMN travel_style;
    ALTER TABLE profiles RENAME COLUMN travel_style_array TO travel_style;

    RAISE NOTICE 'Migrated travel_style from TEXT to TEXT[]';
  ELSE
    -- Column doesn't exist or is already array, create if needed
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS travel_style TEXT[];
    RAISE NOTICE 'Created travel_style as TEXT[] (was already array or did not exist)';
  END IF;
END $$;

COMMENT ON COLUMN profiles.travel_style IS
  'Array of travel style preferences. Options: Solo traveler, Open to companions, Traveling with partner, Traveling with family, Prefer privacy. User can select multiple.';

-- ============================================================================
-- Step 4: Add Content Preferences (JSONB for opt-in personalization)
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS content_preferences JSONB DEFAULT '{
  "show_personalized_safety": false,
  "show_personalized_community": false,
  "share_gender_with_groups": false
}'::jsonb;

COMMENT ON COLUMN profiles.content_preferences IS
  'JSONB object controlling personalized content and privacy. All default to false (opt-in, not opt-out). Keys: show_personalized_safety (women/men-specific safety resources), show_personalized_community (personalized group recommendations), share_gender_with_groups (allow gender-specific groups to appear in recommendations).';

-- ============================================================================
-- Step 5: Ensure updated_at trigger updates on new columns
-- ============================================================================

-- Verify that updated_at trigger exists and covers all columns
-- (Should already exist from previous migrations, but verify)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_profiles_updated_at'
    AND tgrelid = 'profiles'::regclass
  ) THEN
    -- Create trigger function if it doesn't exist
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    -- Create trigger
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE 'Created updated_at trigger for profiles table';
  END IF;
END $$;

-- ============================================================================
-- Step 6: Set default values for existing rows (NULL → defaults)
-- ============================================================================

-- Set content_preferences for existing users (ensure all have the default object)
UPDATE profiles
SET content_preferences = '{
  "show_personalized_safety": false,
  "show_personalized_community": false,
  "share_gender_with_groups": false
}'::jsonb
WHERE content_preferences IS NULL;

-- ============================================================================
-- Step 7: Validation
-- ============================================================================

DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  -- Check all required columns exist
  SELECT ARRAY_AGG(column_name)
  INTO missing_columns
  FROM (
    SELECT unnest(ARRAY[
      'gender_identity',
      'gender_custom',
      'pronouns',
      'pronouns_custom',
      'interests',
      'travel_style',
      'content_preferences'
    ]) AS column_name
  ) expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND table_schema = 'public'
    AND information_schema.columns.column_name = expected.column_name
  );

  IF array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Migration failed: Missing columns: %', array_to_string(missing_columns, ', ');
  END IF;

  RAISE NOTICE '✅ Phase 1 migration completed successfully';
  RAISE NOTICE '   - Added gender_identity (optional)';
  RAISE NOTICE '   - Added pronouns (optional)';
  RAISE NOTICE '   - Added interests (array)';
  RAISE NOTICE '   - Migrated travel_style to array';
  RAISE NOTICE '   - Added content_preferences (JSONB, defaults to all false)';
END $$;
