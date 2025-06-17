
-- First, let's check if there are any problematic triggers or functions
-- Drop any triggers that might be interfering
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

-- Drop and recreate the handle_new_user function to ensure it's clean
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.on_user_created() CASCADE;

-- Create a simple, clean user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, region)
  VALUES (NEW.id, NEW.email, 'Australia')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Let's also drop and recreate all RLS policies to ensure they're clean
DROP POLICY IF EXISTS "Allow users to manage their own drawers" ON public.drawers;
DROP POLICY IF EXISTS "Allow users to manage items in their drawers" ON public.items;
DROP POLICY IF EXISTS "Allow users to manage their own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Allow users to manage their own profile" ON public.profiles;

-- Create the simplest possible RLS policies
CREATE POLICY "Users can manage their own drawers" ON public.drawers
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage items in their drawers" ON public.items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.drawers 
            WHERE drawers.id = items.drawer_id 
            AND drawers.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.drawers 
            WHERE drawers.id = items.drawer_id 
            AND drawers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own shopping lists" ON public.shopping_lists
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own profile" ON public.profiles
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Ensure all tables have RLS enabled
ALTER TABLE public.drawers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean up any potential role-related issues by ensuring no role column exists where it shouldn't
DO $$
BEGIN
    -- Check if there's a role column in drawers table that shouldn't be there
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'drawers' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.drawers DROP COLUMN role;
    END IF;
END $$;
