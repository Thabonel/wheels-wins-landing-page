CREATE POLICY comments_delete ON public.comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY post_likes_select ON public.post_likes FOR SELECT USING (true);
CREATE POLICY post_likes_insert ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY post_likes_delete ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY shared_locations_select ON public.shared_locations FOR SELECT USING (
    is_active = true AND (expires_at IS NULL OR expires_at > NOW())
);
CREATE POLICY shared_locations_all ON public.shared_locations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY privacy_settings_all ON public.privacy_settings FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campgrounds_updated_at BEFORE UPDATE ON public.campgrounds
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_favorite_locations_updated_at BEFORE UPDATE ON public.favorite_locations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at BEFORE UPDATE ON public.privacy_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION: 20251010000000-add-vehicle-fuel-consumption.sql
-- ============================================================

-- Comprehensive Vehicle Fuel Consumption Migration
-- Creates vehicles table if missing, then adds fuel consumption tracking
-- Idempotent: Safe to run multiple times

-- Step 1: Create vehicles table if it doesn't exist
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vin TEXT UNIQUE,
  license_plate TEXT,
  vehicle_type TEXT DEFAULT 'rv' CHECK (vehicle_type IN ('rv', 'motorhome', 'travel_trailer', 'fifth_wheel', 'truck', 'car', 'motorcycle', 'boat')),
  fuel_type TEXT DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid', 'propane')),
  fuel_capacity_gallons DECIMAL(6,2),
  engine_size TEXT,
  transmission TEXT,
  mileage_current INTEGER,
  mileage_purchased INTEGER,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  insurance_company TEXT,
  insurance_policy TEXT,
  insurance_expires DATE,
  registration_expires DATE,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  image_urls TEXT[],
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS if not already enabled
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'vehicles'
        AND policyname = 'Users can manage own vehicles'
    ) THEN
        CREATE POLICY "Users can manage own vehicles" ON vehicles
          FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Step 4: Create basic indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_primary ON vehicles(user_id, is_primary);

-- Step 5: Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create updated_at trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_vehicles_updated_at'
    ) THEN
        CREATE TRIGGER update_vehicles_updated_at
          BEFORE UPDATE ON vehicles
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Step 7: Add fuel consumption columns (idempotent with IF NOT EXISTS)
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS fuel_consumption_mpg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fuel_consumption_l_per_100km DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fuel_consumption_source TEXT DEFAULT 'user_provided',
ADD COLUMN IF NOT EXISTS fuel_consumption_last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS fuel_consumption_sample_size INTEGER DEFAULT 0;

-- Step 8: Add constraint if column exists but constraint doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'vehicles_fuel_consumption_source_check'
    ) THEN
        ALTER TABLE vehicles
        ADD CONSTRAINT vehicles_fuel_consumption_source_check
        CHECK (fuel_consumption_source IN ('user_provided', 'calculated_from_fillups', 'manufacturer_spec'));
    END IF;
END $$;

-- Step 9: Add column comments
COMMENT ON COLUMN vehicles.fuel_consumption_mpg IS 'Miles per gallon - primary metric for US users';
COMMENT ON COLUMN vehicles.fuel_consumption_l_per_100km IS 'Liters per 100km - primary metric for international users';
COMMENT ON COLUMN vehicles.fuel_consumption_source IS 'How this fuel consumption was determined';
COMMENT ON COLUMN vehicles.fuel_consumption_last_updated IS 'When fuel consumption was last updated';
COMMENT ON COLUMN vehicles.fuel_consumption_sample_size IS 'Number of fuel log entries used for calculated average';

-- Step 10: Create fuel consumption index
CREATE INDEX IF NOT EXISTS idx_vehicles_fuel_consumption ON vehicles(user_id, fuel_consumption_mpg) WHERE fuel_consumption_mpg IS NOT NULL;


-- ============================================================
-- MIGRATION: 20251011000001_add_calendar_events_columns.sql
-- ============================================================

ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

CREATE INDEX IF NOT EXISTS idx_calendar_events_all_day ON public.calendar_events(all_day);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON public.calendar_events(user_id, date);


-- ============================================================
-- MIGRATION: 20251014000000-add-location-preferences.sql
-- ============================================================

-- Add location_preferences column to user_settings table
-- Fixes "Failed to save settings" error when updating location sharing preferences

-- Add location_preferences column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_settings'
        AND column_name = 'location_preferences'
    ) THEN
        ALTER TABLE public.user_settings
        ADD COLUMN location_preferences JSONB DEFAULT '{
            "use_current_location": false,
            "auto_detect_location": false
        }'::jsonb;
    END IF;
END $$;

-- Add GIN index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_user_settings_location_prefs
ON public.user_settings USING GIN (location_preferences);

-- Add helpful comment
COMMENT ON COLUMN public.user_settings.location_preferences IS 'User location preferences including default location and auto-detection settings';


-- ============================================================
-- MIGRATION: 20251014000001-standardize-profiles-schema.sql
-- ============================================================

-- Standardize Profiles Schema: Enforce 'id' as Primary Key
-- This migration ensures the profiles table consistently uses 'id UUID' as the primary key
-- matching Supabase auth.users convention and preventing future id/user_id confusion.
--
-- Problem: 9 months of confusion between profiles.id vs profiles.user_id
-- Solution: Standardize on 'id' everywhere (Supabase standard)
--
-- Date: October 14, 2025

-- ============================================================================
-- Step 1: Ensure profiles table has correct structure
-- ============================================================================

DO $$
BEGIN
    -- Check if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN

        -- Ensure id column exists and is UUID type
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'profiles'
            AND column_name = 'id'
            AND data_type = 'uuid'
            AND table_schema = 'public'
        ) THEN
            -- If id doesn't exist as UUID, something is very wrong
            RAISE EXCEPTION 'profiles.id column is missing or has wrong type. Database schema corrupted.';
        END IF;

        -- Check if there's a conflicting user_id column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'profiles'
            AND column_name = 'user_id'
            AND table_schema = 'public'
        ) THEN
            RAISE NOTICE 'Found conflicting user_id column in profiles table. Please review schema.';
        END IF;

    ELSE
        RAISE EXCEPTION 'profiles table does not exist. Run foundation migration first.';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Add comment documentation to profiles table
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles table. Primary key is "id" (UUID) matching auth.users(id). Never use "user_id" column name for primary key.';
COMMENT ON COLUMN profiles.id IS 'Primary key (UUID) referencing auth.users(id). STANDARD: Always query with .eq("id", user_id) NOT .eq("user_id", user_id)';

-- ============================================================================
-- Step 3: Create validation function to prevent future mistakes
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_profiles_has_id_column()
RETURNS TABLE(is_valid BOOLEAN, error_message TEXT) AS $$
BEGIN
    -- Check if profiles.id exists and is UUID
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'id'
        AND data_type = 'uuid'
        AND table_schema = 'public'
    ) THEN
        RETURN QUERY SELECT FALSE, 'profiles table must have id UUID column as primary key';
        RETURN;
    END IF;

    -- Check if there's a conflicting user_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        RETURN QUERY SELECT FALSE, 'profiles table should not have separate user_id column (use id instead)';
        RETURN;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT TRUE, 'profiles table schema is correct'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_profiles_has_id_column() IS 'Validates that profiles table uses id (not user_id) as primary key. Call this on backend startup to catch schema errors early.';

-- ============================================================================
-- Step 4: Run validation and fail migration if schema is wrong
-- ============================================================================

DO $$
DECLARE
    validation_result RECORD;
BEGIN
    SELECT * INTO validation_result FROM validate_profiles_has_id_column();

    IF NOT validation_result.is_valid THEN
        RAISE EXCEPTION 'Schema validation failed: %', validation_result.error_message;
    END IF;

    RAISE NOTICE '✅ Profiles schema validated successfully. Primary key is "id" (UUID).';
END $$;


-- ============================================================
-- MIGRATION: 20251123121500-fix-affiliate-products-rls-and-grants.sql
-- ============================================================

-- Fix affiliate_products GRANTs and RLS to unblock admin panel
-- Date: 2025-11-23
-- Summary:
-- - Ensure required GRANTs for anon/authenticated
-- - Keep public shop read-only to active products
-- - Allow CRUD only for verified admins (based on admin_users)
-- - Ensure clicks table allows anonymous inserts
-- - Add performance index

-- 1) Ensure schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2) Table grants
-- Public/anon can read active rows via RLS, but still needs SELECT privilege
GRANT SELECT ON TABLE public.affiliate_products TO anon;

-- Authenticated will be gated by RLS for admin-only CRUD, but needs GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.affiliate_products TO authenticated;

-- Clicks table: allow inserts from anon/authenticated (RLS will permit anonymously)
GRANT SELECT, INSERT ON TABLE public.affiliate_product_clicks TO anon, authenticated;

-- In case sequences are used by defaults
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 3) Create a simple admin check if not already present (rely on existing function if exists)
-- Uses previously-defined function public.check_user_is_admin(uuid)
-- If it doesn't exist in your project, uncomment the block below.
--
-- CREATE OR REPLACE FUNCTION public.check_user_is_admin(check_user_id uuid)
-- RETURNS boolean
-- LANGUAGE sql
-- STABLE
-- AS $$
--   SELECT EXISTS (
--     SELECT 1 FROM public.admin_users 
--     WHERE user_id = check_user_id 
--       AND role = 'admin' 
--       AND status = 'active'
--   );
-- $$;

-- 4) Recreate clean, permissive RLS policies
-- Drop existing policies on affiliate_products to avoid conflicts
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'affiliate_products'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.affiliate_products', pol.policyname);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

-- Public/anon: can SELECT only active products (public shop)
CREATE POLICY public_select_active
  ON public.affiliate_products
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admin (authenticated): view ALL products
CREATE POLICY admin_select_all
  ON public.affiliate_products
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (public.check_user_is_admin(auth.uid()));

-- Admin (authenticated): INSERT
CREATE POLICY admin_insert
  ON public.affiliate_products
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.check_user_is_admin(auth.uid()));

-- Admin (authenticated): UPDATE
CREATE POLICY admin_update
  ON public.affiliate_products
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (public.check_user_is_admin(auth.uid()))
  WITH CHECK (public.check_user_is_admin(auth.uid()));

-- Admin (authenticated): DELETE
CREATE POLICY admin_delete
  ON public.affiliate_products
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (public.check_user_is_admin(auth.uid()));

-- Click tracking table policies: allow anonymous and authenticated inserts
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'affiliate_product_clicks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.affiliate_product_clicks', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.affiliate_product_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY clicks_insert_anyone
  ON public.affiliate_product_clicks
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 5) Performance index used by shop queries
CREATE INDEX IF NOT EXISTS idx_affiliate_products_active_sort
  ON public.affiliate_products (is_active, sort_order);

-- 6) Verification helpers (non-fatal if pg_policies is restricted)
-- SELECT policyname, roles, cmd, permissive, qual
-- FROM pg_policies
-- WHERE tablename = 'affiliate_products'
-- ORDER BY policyname;



-- ============================================================
-- MIGRATION: 20260101000000_create_community_knowledge.sql
-- ============================================================

-- Community Knowledge Center
-- Allows users to submit guides/articles for admin approval
-- Public browsing, PAM integration, print/PDF export

-- Main knowledge table
CREATE TABLE IF NOT EXISTS public.community_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown format
  excerpt TEXT, -- Short summary for listing pages
  category TEXT NOT NULL, -- 'shipping', 'maintenance', 'travel_tips', 'camping', 'routes', 'general'

  -- Author & Approval
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  difficulty_level TEXT, -- 'beginner', 'intermediate', 'advanced'
  estimated_read_time INTEGER, -- minutes

  -- Engagement
  views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User feedback on articles
CREATE TABLE IF NOT EXISTS public.community_knowledge_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES community_knowledge(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One feedback per user per article
  UNIQUE(article_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_knowledge_status ON community_knowledge(status);
CREATE INDEX IF NOT EXISTS idx_community_knowledge_category ON community_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_community_knowledge_author ON community_knowledge(author_id);
CREATE INDEX IF NOT EXISTS idx_community_knowledge_created ON community_knowledge(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_knowledge_tags ON community_knowledge USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_community_knowledge_feedback_article ON community_knowledge_feedback(article_id);

-- RLS Policies
ALTER TABLE public.community_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_knowledge_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved articles
CREATE POLICY "public_read_approved_articles"
  ON community_knowledge
  FOR SELECT
  USING (status = 'approved');

-- Authenticated users can submit articles
CREATE POLICY "authenticated_create_articles"
  ON community_knowledge
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Authors can view their own pending/rejected articles
CREATE POLICY "authors_read_own_articles"
  ON community_knowledge
  FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

-- Authors can update their own pending articles
CREATE POLICY "authors_update_pending_articles"
  ON community_knowledge
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id AND status = 'pending')
  WITH CHECK (auth.uid() = author_id AND status = 'pending');

-- Authors can delete their own pending articles
CREATE POLICY "authors_delete_pending_articles"
  ON community_knowledge
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id AND status = 'pending');

-- Admins can do everything
CREATE POLICY "admins_all_access_knowledge"
  ON community_knowledge
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Feedback policies
CREATE POLICY "authenticated_create_feedback"
  ON community_knowledge_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_read_own_feedback"
  ON community_knowledge_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_feedback"
  ON community_knowledge_feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_all_access_feedback"
  ON community_knowledge_feedback
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Function to update helpful_count when feedback changes
CREATE OR REPLACE FUNCTION update_article_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_knowledge
    SET helpful_count = helpful_count + (CASE WHEN NEW.is_helpful THEN 1 ELSE -1 END)
    WHERE id = NEW.article_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE community_knowledge
    SET helpful_count = helpful_count + (CASE WHEN NEW.is_helpful THEN 1 ELSE -1 END) - (CASE WHEN OLD.is_helpful THEN 1 ELSE -1 END)
    WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_knowledge
    SET helpful_count = helpful_count - (CASE WHEN OLD.is_helpful THEN 1 ELSE -1 END)
    WHERE id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_helpful_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON community_knowledge_feedback
FOR EACH ROW EXECUTE FUNCTION update_article_helpful_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_community_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_trigger
BEFORE UPDATE ON community_knowledge
FOR EACH ROW EXECUTE FUNCTION update_community_knowledge_updated_at();


-- ============================================================
-- MIGRATION: 20260107000001_create_meal_tables.sql
-- ============================================================

-- PAM Meal Planning System - Database Schema
-- Creates 5 tables: recipes, pantry_items, meal_plans, shopping_lists, user_dietary_preferences
-- Includes RLS policies, indexes, and triggers

-- 1. RECIPES TABLE (with sharing and nutrition)
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  source_type TEXT CHECK (source_type IN ('youtube', 'web', 'manual', 'api')),
  thumbnail_url TEXT,

  -- Recipe Data (JSONB for flexibility)
  ingredients JSONB NOT NULL,
  instructions JSONB NOT NULL,

  -- Metadata
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),

  -- Nutrition (from Edamam API)
  nutrition_info JSONB,
  edamam_recipe_id TEXT,

  -- Categorization
  meal_type TEXT[],
  cuisine TEXT,
  dietary_tags TEXT[],

  -- Sharing & Visibility
  is_public BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  shared_with UUID[],
  fork_count INTEGER DEFAULT 0,
  original_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,

  -- Stats
  views INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes USING GIN(meal_type);
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_tags ON recipes USING GIN(dietary_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_recipes_shared_with ON recipes USING GIN(shared_with);

-- 2. PANTRY ITEMS TABLE
CREATE TABLE IF NOT EXISTS pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Item Info
  ingredient_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,

  -- Storage
  location TEXT,
  expiry_date DATE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pantry_user_id ON pantry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_expiry ON pantry_items(expiry_date) WHERE expiry_date IS NOT NULL;

-- 3. MEAL PLANS TABLE
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Schedule
  plan_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),

  -- Recipe Link
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,

  -- Optional Override
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe ON meal_plans(recipe_id);

-- 4. SHOPPING LISTS TABLE
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- List Info
  list_name TEXT NOT NULL DEFAULT 'Shopping List',

  -- Items (JSONB for flexibility)
  items JSONB NOT NULL,

  -- Metadata
  generated_from_meal_plan BOOLEAN DEFAULT false,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);

-- 5. USER DIETARY PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS user_dietary_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dietary Restrictions (enforced strictly)
  dietary_restrictions TEXT[],

  -- Allergies (critical - never show recipes with these)
  allergies TEXT[],

  -- Preferences (not enforced, just for recommendations)
  preferred_cuisines TEXT[],
  disliked_ingredients TEXT[],

  -- Nutrition Goals (for meal planning)
  daily_calorie_goal INTEGER,
  daily_protein_goal INTEGER,
  daily_carb_goal INTEGER,
  daily_fat_goal INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dietary_prefs_user_id ON user_dietary_preferences(user_id);

-- RLS POLICIES

-- RECIPES (with sharing logic)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible recipes" ON recipes
  FOR SELECT USING (
    auth.uid() = user_id OR
    is_public = true OR
    auth.uid() = ANY(shared_with)
  );

CREATE POLICY "Users can insert own recipes" ON recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes" ON recipes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes" ON recipes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access recipes" ON recipes
  FOR ALL TO service_role USING (true);

-- PANTRY ITEMS
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pantry" ON pantry_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own pantry" ON pantry_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pantry" ON pantry_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own pantry" ON pantry_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access pantry" ON pantry_items
  FOR ALL TO service_role USING (true);

-- MEAL PLANS
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own meal plans" ON meal_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own meal plans" ON meal_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own meal plans" ON meal_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own meal plans" ON meal_plans
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access meal plans" ON meal_plans
  FOR ALL TO service_role USING (true);

-- SHOPPING LISTS
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own shopping lists" ON shopping_lists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own shopping lists" ON shopping_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own shopping lists" ON shopping_lists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own shopping lists" ON shopping_lists
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access shopping lists" ON shopping_lists
  FOR ALL TO service_role USING (true);

-- USER DIETARY PREFERENCES
ALTER TABLE user_dietary_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own dietary prefs" ON user_dietary_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own dietary prefs" ON user_dietary_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own dietary prefs" ON user_dietary_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own dietary prefs" ON user_dietary_preferences
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access dietary prefs" ON user_dietary_preferences
  FOR ALL TO service_role USING (true);

-- TRIGGERS (Auto-update timestamps)

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pantry_items_updated_at BEFORE UPDATE ON pantry_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietary_prefs_updated_at BEFORE UPDATE ON user_dietary_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- MIGRATION: 20260108000001_add_solo_traveler_profile_fields.sql
-- ============================================================

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


-- ============================================================
-- MIGRATION: 20260217000000_create_ocr_cache.sql
-- ============================================================

-- Create ocr_cache table for caching OCR results by file hash.
-- Same file uploaded twice returns instant cached response, preventing cost blowouts.

CREATE TABLE IF NOT EXISTS ocr_cache (
  file_hash TEXT PRIMARY KEY,
  ocr_text TEXT NOT NULL,
  confidence FLOAT,
  confidence_method TEXT,
  method TEXT NOT NULL,
  page_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocr_cache_created ON ocr_cache (created_at);
