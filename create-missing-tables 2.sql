-- =====================================================
-- CREATE MISSING TABLES FOR WHEELS & WINS
-- =====================================================
-- Run this in Supabase SQL Editor to fix the 403 errors
-- =====================================================

-- 1. Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can manage their own preferences
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON public.user_preferences(category);

-- 2. Create poi_categories table
CREATE TABLE IF NOT EXISTS public.poi_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  parent_category_id UUID REFERENCES public.poi_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.poi_categories ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read POI categories (they're reference data)
CREATE POLICY "Anyone can read poi categories" ON public.poi_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_poi_categories_is_active ON public.poi_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_poi_categories_sort_order ON public.poi_categories(sort_order);

-- 3. Insert default POI categories for RV travelers
INSERT INTO public.poi_categories (name, description, icon, color, sort_order, is_active) VALUES
  ('RV Parks', 'RV parks and campgrounds', 'tent', '#10B981', 1, true),
  ('Fuel Stations', 'Gas and diesel stations', 'fuel', '#EF4444', 2, true),
  ('Rest Stops', 'Highway rest areas', 'coffee', '#3B82F6', 3, true),
  ('Walmart', 'Walmart locations (overnight parking)', 'shopping-cart', '#0EA5E9', 4, true),
  ('Dump Stations', 'RV dump stations', 'trash-2', '#6366F1', 5, true),
  ('Repair Shops', 'RV repair and service centers', 'wrench', '#F97316', 6, true),
  ('Groceries', 'Grocery stores', 'shopping-bag', '#84CC16', 7, true),
  ('Attractions', 'Tourist attractions and points of interest', 'map-pin', '#EC4899', 8, true),
  ('Medical', 'Hospitals and urgent care', 'heart', '#DC2626', 9, true),
  ('WiFi Spots', 'Free WiFi locations', 'wifi', '#8B5CF6', 10, true)
ON CONFLICT (name) DO NOTHING;

-- 4. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Add triggers for updated_at
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_poi_categories_updated_at ON public.poi_categories;
CREATE TRIGGER update_poi_categories_updated_at
  BEFORE UPDATE ON public.poi_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this script, these queries should work:
-- SELECT * FROM public.user_preferences LIMIT 1;
-- SELECT * FROM public.poi_categories LIMIT 10;