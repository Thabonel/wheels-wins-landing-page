-- Add missing integration_preferences column to user_settings table
-- This fixes the frontend settings loading issues

-- Add the missing column if it doesn't exist
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS integration_preferences JSONB DEFAULT '{
  "shop_travel_integration": true,
  "auto_add_purchases_to_storage": false
}'::jsonb;

-- Update existing records that have null integration_preferences
UPDATE public.user_settings 
SET integration_preferences = '{
  "shop_travel_integration": true,
  "auto_add_purchases_to_storage": false
}'::jsonb
WHERE integration_preferences IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_integration_prefs ON public.user_settings USING GIN (integration_preferences);

COMMENT ON COLUMN public.user_settings.integration_preferences IS 'User preferences for integrations between different app features';