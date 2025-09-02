-- RLS Fix for Wheels & Wins - Handles constraint issues
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop existing tables to start fresh (backup data first if needed)
DROP TABLE IF EXISTS public.user_profiles_extended CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;

-- Step 2: Create tables with proper constraints
CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_preferences JSONB DEFAULT '{"email_notifications": true, "push_notifications": false, "marketing_emails": false, "trip_reminders": true, "maintenance_alerts": true, "weather_warnings": true}'::jsonb,
    privacy_preferences JSONB DEFAULT '{"profile_visibility": "public", "location_sharing": false, "activity_tracking": true, "data_collection": true}'::jsonb,
    display_preferences JSONB DEFAULT '{"theme": "light", "font_size": "medium", "high_contrast": false, "reduced_motion": false, "language": "en"}'::jsonb,
    regional_preferences JSONB DEFAULT '{"currency": "USD", "units": "imperial", "timezone": "America/New_York", "date_format": "MM/DD/YYYY"}'::jsonb,
    pam_preferences JSONB DEFAULT '{"voice_enabled": true, "proactive_suggestions": true, "response_style": "friendly", "expertise_level": "intermediate", "knowledge_sources": true}'::jsonb,
    integration_preferences JSONB DEFAULT '{"shop_travel_integration": true, "auto_add_purchases_to_storage": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_tier TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_profiles_extended (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    bio TEXT,
    avatar_url TEXT,
    cover_image_url TEXT,
    location TEXT,
    website TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    interests TEXT[],
    travel_style TEXT,
    rv_type TEXT,
    years_of_experience INTEGER,
    favorite_destinations TEXT[],
    bucket_list JSONB DEFAULT '[]'::jsonb,
    achievements JSONB DEFAULT '[]'::jsonb,
    statistics JSONB DEFAULT '{}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_profiles_extended_user_id ON public.user_profiles_extended(user_id);

-- Step 4: Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles_extended ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- user_settings policies
CREATE POLICY "Users can view own settings" 
ON public.user_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" 
ON public.user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
ON public.user_settings FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" 
ON public.user_settings FOR DELETE 
USING (auth.uid() = user_id);

-- user_subscriptions policies
CREATE POLICY "Users can view own subscription" 
ON public.user_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" 
ON public.user_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" 
ON public.user_subscriptions FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- user_profiles_extended policies
CREATE POLICY "Anyone can view profiles" 
ON public.user_profiles_extended FOR SELECT 
USING (true);

CREATE POLICY "Users can insert own profile" 
ON public.user_profiles_extended FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.user_profiles_extended FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" 
ON public.user_profiles_extended FOR DELETE 
USING (auth.uid() = user_id);

-- Step 6: Grant permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_profiles_extended TO authenticated;
GRANT SELECT ON public.user_profiles_extended TO anon;

-- Step 7: Insert default records for all existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users
    LOOP
        -- Insert user_settings
        INSERT INTO public.user_settings (user_id)
        VALUES (user_record.id)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Insert user_subscriptions
        INSERT INTO public.user_subscriptions (user_id)
        VALUES (user_record.id)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Insert user_profiles_extended
        INSERT INTO public.user_profiles_extended (user_id)
        VALUES (user_record.id)
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END $$;

-- Step 8: Create function to auto-create records for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.user_subscriptions (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.user_profiles_extended (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 10: Verify the setup
SELECT 
    'Setup Complete!' as status,
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM public.user_settings) as user_settings_count,
    (SELECT COUNT(*) FROM public.user_subscriptions) as user_subscriptions_count,
    (SELECT COUNT(*) FROM public.user_profiles_extended) as user_profiles_extended_count,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('user_settings', 'user_subscriptions', 'user_profiles_extended')) as total_policies;