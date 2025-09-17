-- Final fix for user_settings RLS policy 403 errors
-- Addresses potential auth.uid() and UUID casting issues

-- Check if user_settings table exists, create if not
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_preferences JSONB DEFAULT '{}',
    privacy_preferences JSONB DEFAULT '{}',
    display_preferences JSONB DEFAULT '{}',
    regional_preferences JSONB DEFAULT '{}',
    pam_preferences JSONB DEFAULT '{}',
    integration_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure unique constraint on user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id_unique ON public.user_settings(user_id);

-- Disable RLS temporarily for cleanup
ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start completely fresh
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_settings' AND schemaname = 'public'
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_settings', pol.policyname);
    END LOOP; 
END $$;

-- Re-enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create a single, robust policy with explicit UUID casting
CREATE POLICY "user_settings_policy" ON public.user_settings
    FOR ALL 
    USING (auth.uid()::uuid = user_id::uuid)
    WITH CHECK (auth.uid()::uuid = user_id::uuid);

-- Service role access for admin operations
CREATE POLICY "service_role_policy" ON public.user_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Ensure proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Verify auth functions are accessible  
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.user_settings IS 'User preferences and settings - Fixed RLS policies';
COMMENT ON POLICY "user_settings_policy" ON public.user_settings IS 'Users can only access their own settings with explicit UUID casting';