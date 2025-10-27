-- Make transition_profiles fields nullable for maximum flexibility
-- Users' plans change constantly - don't force rigid structure

ALTER TABLE transition_profiles
ALTER COLUMN departure_date DROP NOT NULL;

ALTER TABLE transition_profiles
ALTER COLUMN current_phase DROP NOT NULL;

ALTER TABLE transition_profiles
ALTER COLUMN transition_type DROP NOT NULL;

-- Verify changes
SELECT
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'transition_profiles'
AND column_name IN ('departure_date', 'current_phase', 'transition_type');
