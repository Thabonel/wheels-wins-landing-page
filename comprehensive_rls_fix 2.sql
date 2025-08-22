-- =====================================================
-- COMPREHENSIVE RLS POLICY FIXES FOR 403 ERRORS
-- =====================================================
-- This migration fixes RLS policies for tables causing 403 errors
-- and creates missing tables that the application expects.
--
-- Tables addressed:
-- - user_settings (fix policies)
-- - user_subscriptions (fix policies) 
-- - trip_templates (fix policies)
-- - user_preferences (create + policies)
-- - poi_categories (create + policies)
--
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CREATE MISSING TABLES
-- =====================================================

-- Create user_preferences table (application expects this)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  category TEXT DEFAULT 'general', -- e.g., 'travel', 'ui', 'notification'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- Create poi_categories table (Points of Interest Categories)
CREATE TABLE IF NOT EXISTS public.poi_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Icon identifier (e.g., 'restaurant', 'gas-station')
  color TEXT DEFAULT '#3B82F6', -- Hex color for UI
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  parent_category_id UUID REFERENCES public.poi_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poi_categories ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. DROP ALL EXISTING POLICIES (CLEAN SLATE)
-- =====================================================

-- user_settings policies
DROP POLICY IF EXISTS "Users can read their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_select_policy" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert_policy" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update_policy" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_delete_policy" ON public.user_settings;

-- user_subscriptions policies
DROP POLICY IF EXISTS "Users can read their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.user_subscriptions;

-- trip_templates policies
DROP POLICY IF EXISTS "Users can manage own templates" ON public.trip_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON public.trip_templates;
DROP POLICY IF EXISTS "Anyone can view public templates" ON public.trip_templates;

-- user_preferences policies (new table)
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;

-- poi_categories policies (new table)
DROP POLICY IF EXISTS "Anyone can read poi categories" ON public.poi_categories;

-- =====================================================
-- 4. CREATE PROPER RLS POLICIES
-- =====================================================

-- USER_SETTINGS: Users can only access their own settings
CREATE POLICY "user_settings_authenticated_access" ON public.user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- USER_SUBSCRIPTIONS: Users can only access their own subscriptions
CREATE POLICY "user_subscriptions_authenticated_access" ON public.user_subscriptions
  FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhooks, etc.)
CREATE POLICY "user_subscriptions_service_role_access" ON public.user_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TRIP_TEMPLATES: Users can manage their own templates + read public ones
CREATE POLICY "trip_templates_owner_access" ON public.trip_templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trip_templates_public_read" ON public.trip_templates
  FOR SELECT
  TO authenticated, anon
  USING (is_public = true);

-- USER_PREFERENCES: Users can only access their own preferences
CREATE POLICY "user_preferences_authenticated_access" ON public.user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- POI_CATEGORIES: Public read access for all users (reference data)
CREATE POLICY "poi_categories_public_read" ON public.poi_categories
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Admin/service role can manage poi_categories
CREATE POLICY "poi_categories_service_role_manage" ON public.poi_categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 5. GRANT PERMISSIONS TO ROLES
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT SELECT ON public.trip_templates TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.trip_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT SELECT ON public.poi_categories TO authenticated, anon;

-- Grant full permissions to service_role (for system operations)
GRANT ALL ON public.user_settings TO service_role;
GRANT ALL ON public.user_subscriptions TO service_role; 
GRANT ALL ON public.trip_templates TO service_role;
GRANT ALL ON public.user_preferences TO service_role;
GRANT ALL ON public.poi_categories TO service_role;

-- =====================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- user_preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON public.user_preferences(preference_key);
CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON public.user_preferences(category);

-- poi_categories indexes
CREATE INDEX IF NOT EXISTS idx_poi_categories_name ON public.poi_categories(name);
CREATE INDEX IF NOT EXISTS idx_poi_categories_active ON public.poi_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_poi_categories_sort ON public.poi_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_poi_categories_parent ON public.poi_categories(parent_category_id);

-- =====================================================
-- 7. ADD UPDATE TRIGGERS
-- =====================================================

-- user_preferences trigger
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at_trigger
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- poi_categories trigger  
CREATE OR REPLACE FUNCTION update_poi_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_poi_categories_updated_at_trigger
    BEFORE UPDATE ON public.poi_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_poi_categories_updated_at();

-- =====================================================
-- 8. INSERT DEFAULT POI CATEGORIES
-- =====================================================

INSERT INTO public.poi_categories (name, description, icon, color, sort_order) VALUES
('Restaurants', 'Dining establishments and food services', 'restaurant', '#E53E3E', 1),
('Gas Stations', 'Fuel stations and automotive services', 'gas-station', '#38A169', 2), 
('Lodging', 'Hotels, motels, and accommodation', 'hotel', '#3182CE', 3),
('Attractions', 'Tourist attractions and entertainment', 'attraction', '#D69E2E', 4),
('Rest Areas', 'Highway rest stops and picnic areas', 'rest-area', '#805AD5', 5),
('Campgrounds', 'RV parks and camping facilities', 'campground', '#319795', 6),
('Shopping', 'Stores and shopping centers', 'shopping', '#DD6B20', 7),
('Medical', 'Hospitals and medical facilities', 'medical', '#E53E3E', 8),
('Repair Services', 'Vehicle repair and maintenance', 'repair', '#4A5568', 9),
('Scenic Views', 'Scenic overlooks and viewpoints', 'scenic', '#38B2AC', 10)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 9. ADD HELPFUL COMMENTS
-- =====================================================

COMMENT ON TABLE public.user_preferences IS 'User-specific preferences and settings stored as key-value pairs';
COMMENT ON COLUMN public.user_preferences.preference_key IS 'Unique preference identifier (e.g., theme, language, notifications.email)';
COMMENT ON COLUMN public.user_preferences.preference_value IS 'JSON value of the preference setting';
COMMENT ON COLUMN public.user_preferences.category IS 'Preference category for organization (travel, ui, notification, etc.)';

COMMENT ON TABLE public.poi_categories IS 'Categories for Points of Interest used in trip planning';
COMMENT ON COLUMN public.poi_categories.parent_category_id IS 'Self-referencing ID for hierarchical categories';
COMMENT ON COLUMN public.poi_categories.is_active IS 'Whether this category is currently active/visible';
COMMENT ON COLUMN public.poi_categories.sort_order IS 'Display order for category listing';

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Verify tables exist and have correct structure
DO $$ 
BEGIN
    RAISE NOTICE 'Verification: Checking table existence...';
    
    -- Check user_preferences
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
        RAISE NOTICE '✅ user_preferences table exists';
    ELSE
        RAISE NOTICE '❌ user_preferences table missing';
    END IF;
    
    -- Check poi_categories  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'poi_categories') THEN
        RAISE NOTICE '✅ poi_categories table exists';
    ELSE
        RAISE NOTICE '❌ poi_categories table missing';
    END IF;
    
    RAISE NOTICE 'RLS Policy fixes completed successfully!';
    RAISE NOTICE 'Next step: Test with your application to verify 403 errors are resolved.';
END $$;