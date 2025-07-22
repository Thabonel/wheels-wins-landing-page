-- Fix RLS policies for user_settings table to resolve 403 permission denied errors
-- This ensures users can access their own settings data

-- First, disable RLS temporarily to clean up
ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_read_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_insert_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_update_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_delete_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_select_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_delete_own" ON public.user_settings;

-- Re-enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create a single comprehensive policy for all operations
-- This approach is simpler and less prone to conflicts
CREATE POLICY "Enable all operations for users on their own settings" ON public.user_settings
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Ensure the service role can also access (for admin operations)
CREATE POLICY "Service role has full access" ON public.user_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

-- Ensure the auth schema is accessible
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Verify auth.uid() function is accessible
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

-- Add a helpful comment
COMMENT ON POLICY "Enable all operations for users on their own settings" ON public.user_settings IS 
'Allows authenticated users to perform all operations on their own user_settings records';