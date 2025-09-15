-- Fix RLS policies to use authenticated role instead of public role
-- This fixes permission denied errors for authenticated users

-- Drop existing policies for user_settings
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON public.user_settings;

-- Create new policies for user_settings with authenticated role
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON public.user_settings
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Drop existing policies for user_profiles_extended
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.user_profiles_extended;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles_extended;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles_extended;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles_extended;

-- Create new policies for user_profiles_extended with authenticated role
CREATE POLICY "Anyone can view profiles" ON public.user_profiles_extended
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can insert own profile" ON public.user_profiles_extended
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles_extended
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON public.user_profiles_extended
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Drop existing policies for user_subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscription" ON public.user_subscriptions;

-- Create new policies for user_subscriptions with authenticated role
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON public.user_subscriptions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON public.user_subscriptions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscription" ON public.user_subscriptions
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Fix trip_templates policies (remove duplicates and use authenticated role)
DROP POLICY IF EXISTS "Users can view public trip templates" ON public.trip_templates;
DROP POLICY IF EXISTS "authenticated_users_view_public_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "service_role_full_access_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "users_create_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "users_manage_own_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "Users can create their own trip templates" ON public.trip_templates;
DROP POLICY IF EXISTS "Users can update their own trip templates" ON public.trip_templates;
DROP POLICY IF EXISTS "Users can delete their own trip templates" ON public.trip_templates;

-- Create clean policies for trip_templates
CREATE POLICY "Users can view public or own templates" ON public.trip_templates
    FOR SELECT TO authenticated
    USING ((is_public = true) OR (auth.uid() = user_id));

CREATE POLICY "Users can create own templates" ON public.trip_templates
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.trip_templates
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.trip_templates
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Also enable RLS force on these tables for better security
ALTER TABLE public.user_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles_extended FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trip_templates FORCE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.user_profiles_extended TO authenticated;
GRANT ALL ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.trip_templates TO authenticated;

-- Also allow anon users to view public trip templates
CREATE POLICY "Anon can view public templates" ON public.trip_templates
    FOR SELECT TO anon
    USING (is_public = true);

GRANT SELECT ON public.trip_templates TO anon;