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
