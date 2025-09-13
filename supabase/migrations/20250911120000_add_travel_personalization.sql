-- Add travel personalization fields to existing user preferences
-- This enhances the existing preferences JSONB field rather than creating new columns

-- Update existing users with default travel preferences if they don't have them
UPDATE profiles 
SET preferences = COALESCE(preferences, '{}'::jsonb) || jsonb_build_object(
  'travel_interests', ARRAY[]::text[],
  'trip_pace', 'mixed',
  'budget_style', 'mid',
  'past_trip_notes', ''
)
WHERE preferences IS NULL 
   OR NOT (preferences ? 'travel_interests');

-- Create a function to validate travel preferences
CREATE OR REPLACE FUNCTION validate_travel_preferences(prefs jsonb)
RETURNS boolean AS $$
BEGIN
  -- Validate trip_pace
  IF prefs ? 'trip_pace' AND NOT (prefs->>'trip_pace' IN ('slow', 'fast', 'mixed')) THEN
    RETURN false;
  END IF;
  
  -- Validate budget_style  
  IF prefs ? 'budget_style' AND NOT (prefs->>'budget_style' IN ('budget', 'mid', 'luxury')) THEN
    RETURN false;
  END IF;
  
  -- Validate travel_interests (should be array of valid interests)
  IF prefs ? 'travel_interests' THEN
    DECLARE
      interest text;
      valid_interests text[] := ARRAY['culture', 'adventure', 'food', 'nature', 'history', 'relaxation', 'photography', 'wildlife'];
    BEGIN
      FOR interest IN SELECT jsonb_array_elements_text(prefs->'travel_interests')
      LOOP
        IF NOT (interest = ANY(valid_interests)) THEN
          RETURN false;
        END IF;
      END LOOP;
    END;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to ensure valid travel preferences
ALTER TABLE profiles 
ADD CONSTRAINT valid_travel_preferences 
CHECK (validate_travel_preferences(preferences));

-- Create index for faster querying of travel preferences
CREATE INDEX IF NOT EXISTS idx_profiles_travel_interests 
ON profiles USING gin ((preferences->'travel_interests'));

-- Create a helper function to get user travel preferences
CREATE OR REPLACE FUNCTION get_user_travel_preferences(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  user_prefs jsonb;
BEGIN
  SELECT preferences INTO user_prefs
  FROM profiles 
  WHERE id = user_uuid;
  
  -- Return travel-specific preferences with defaults
  RETURN jsonb_build_object(
    'travel_interests', COALESCE(user_prefs->'travel_interests', '[]'::jsonb),
    'trip_pace', COALESCE(user_prefs->>'trip_pace', 'mixed'),
    'budget_style', COALESCE(user_prefs->>'budget_style', 'mid'),
    'past_trip_notes', COALESCE(user_prefs->>'past_trip_notes', ''),
    'feedback_history', COALESCE(user_prefs->'feedback_history', '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_travel_preferences(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_travel_preferences(jsonb) TO authenticated;

-- Comment documenting the travel preferences structure
COMMENT ON COLUMN profiles.preferences IS 'User preferences including travel personalization:
{
  "notifications": boolean,
  "marketing_emails": boolean, 
  "travel_interests": ["culture", "adventure", "food", "nature", "history", "relaxation", "photography", "wildlife"],
  "trip_pace": "slow|fast|mixed",
  "budget_style": "budget|mid|luxury", 
  "past_trip_notes": "string",
  "feedback_history": [{"response_id": "uuid", "rating": 1|-1, "timestamp": "iso_date"}]
}';