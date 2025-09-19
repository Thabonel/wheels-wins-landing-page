
-- First, let's clean up all the conflicting RLS policies and create simple, working ones

-- Drop all existing policies on drawers table
DROP POLICY IF EXISTS "Users can view their own drawers" ON public.drawers;
DROP POLICY IF EXISTS "Users can insert their own drawers" ON public.drawers;
DROP POLICY IF EXISTS "Users can update their own drawers" ON public.drawers;
DROP POLICY IF EXISTS "Users can delete their own drawers" ON public.drawers;

-- Drop all existing policies on items table
DROP POLICY IF EXISTS "Users can view items in their drawers" ON public.items;
DROP POLICY IF EXISTS "Users can insert items in their drawers" ON public.items;
DROP POLICY IF EXISTS "Users can update items in their drawers" ON public.items;
DROP POLICY IF EXISTS "Users can delete items in their drawers" ON public.items;

-- Drop all existing policies on shopping_lists table
DROP POLICY IF EXISTS "Users can view their own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can insert their own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can update their own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can delete their own shopping lists" ON public.shopping_lists;

-- Drop all existing policies on profiles table that might be causing issues
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Ensure RLS is enabled on all tables
ALTER TABLE public.drawers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies for drawers
CREATE POLICY "Allow users to manage their own drawers" ON public.drawers
    FOR ALL USING (auth.uid() = user_id);

-- Create simple, working policies for items (through drawer ownership)
CREATE POLICY "Allow users to manage items in their drawers" ON public.items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.drawers 
            WHERE drawers.id = items.drawer_id 
            AND drawers.user_id = auth.uid()
        )
    );

-- Create simple, working policies for shopping_lists
CREATE POLICY "Allow users to manage their own shopping lists" ON public.shopping_lists
    FOR ALL USING (auth.uid() = user_id);

-- Create simple, working policies for profiles
CREATE POLICY "Allow users to manage their own profile" ON public.profiles
    FOR ALL USING (auth.uid() = user_id);

-- Fix the user_id column in drawers table to ensure it's not nullable
-- and has proper constraints
ALTER TABLE public.drawers ALTER COLUMN user_id SET NOT NULL;

-- Ensure the profiles table has proper constraints
DO $$
BEGIN
    -- Check if user_id column is nullable and fix it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_id' 
        AND is_nullable = 'YES'
    ) THEN
        -- First update any NULL values
        UPDATE public.profiles SET user_id = auth.uid() WHERE user_id IS NULL;
        
        -- Then make the column NOT NULL
        ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- Clean up any orphaned records that might be causing issues
DELETE FROM public.items WHERE drawer_id NOT IN (SELECT id FROM public.drawers);
DELETE FROM public.shopping_lists WHERE user_id IS NULL;
DELETE FROM public.drawers WHERE user_id IS NULL;

-- Create a simple function to help with debugging auth issues (fixed column name)
CREATE OR REPLACE FUNCTION public.debug_auth_state()
RETURNS TABLE (
    current_user_id uuid,
    session_user_name text,
    user_role text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        auth.uid() as current_user_id,
        CURRENT_USER as session_user_name,
        current_setting('role', true) as user_role;
$$;
