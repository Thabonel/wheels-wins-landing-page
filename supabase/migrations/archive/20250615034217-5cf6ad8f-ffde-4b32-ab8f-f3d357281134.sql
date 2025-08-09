
-- Fix RLS policies for drawers table
DROP POLICY IF EXISTS "Allow insert for own drawers" ON public.drawers;
DROP POLICY IF EXISTS "Allow select for own drawers" ON public.drawers;
DROP POLICY IF EXISTS "Users can view their own drawers" ON public.drawers;
DROP POLICY IF EXISTS "Users can insert their own drawers" ON public.drawers;
DROP POLICY IF EXISTS "Users can update their own drawers" ON public.drawers;
DROP POLICY IF EXISTS "Users can delete their own drawers" ON public.drawers;

-- Ensure RLS is enabled on drawers
ALTER TABLE public.drawers ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies for drawers
CREATE POLICY "Users can view their own drawers" ON public.drawers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drawers" ON public.drawers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drawers" ON public.drawers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drawers" ON public.drawers
    FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS policies for items table
DROP POLICY IF EXISTS "Users can view items in their drawers" ON public.items;
DROP POLICY IF EXISTS "Users can insert items in their drawers" ON public.items;
DROP POLICY IF EXISTS "Users can update items in their drawers" ON public.items;
DROP POLICY IF EXISTS "Users can delete items in their drawers" ON public.items;

-- Ensure RLS is enabled on items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies for items
CREATE POLICY "Users can view items in their drawers" ON public.items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.drawers 
            WHERE drawers.id = items.drawer_id 
            AND drawers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert items in their drawers" ON public.items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.drawers 
            WHERE drawers.id = items.drawer_id 
            AND drawers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items in their drawers" ON public.items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.drawers 
            WHERE drawers.id = items.drawer_id 
            AND drawers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete items in their drawers" ON public.items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.drawers 
            WHERE drawers.id = items.drawer_id 
            AND drawers.user_id = auth.uid()
        )
    );

-- Fix shopping_lists table RLS
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shopping lists" ON public.shopping_lists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping lists" ON public.shopping_lists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping lists" ON public.shopping_lists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping lists" ON public.shopping_lists
    FOR DELETE USING (auth.uid() = user_id);

-- Fix profiles table user_id constraint (make it NOT NULL if it isn't already)
DO $$
BEGIN
    -- Check if user_id column is nullable and fix it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_id' 
        AND is_nullable = 'YES'
    ) THEN
        -- First update any NULL values to a default
        UPDATE public.profiles SET user_id = auth.uid() WHERE user_id IS NULL;
        
        -- Then make the column NOT NULL
        ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- Ensure proper trigger exists for profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, region)
    VALUES (NEW.id, NEW.email, 'Australia')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Clean up any orphaned records and ensure data integrity
DELETE FROM public.items WHERE drawer_id NOT IN (SELECT id FROM public.drawers);
DELETE FROM public.drawers WHERE user_id IS NULL;
DELETE FROM public.shopping_lists WHERE user_id IS NULL;
