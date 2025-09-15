-- EMERGENCY FIX: Create missing user_settings table
-- Apply this via Supabase Dashboard > SQL Editor > New Query > Run

-- =============================================================================
-- CRITICAL FIX FOR SETTINGS LOADING ISSUES
-- This SQL creates the missing user_settings table that the backend expects
-- =============================================================================

-- 1. Create user_settings table with exact structure expected by backend
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Notification preferences matching frontend interface
    notification_preferences JSONB DEFAULT '{
        "email_notifications": true,
        "push_notifications": true,
        "marketing_emails": false,
        "trip_reminders": true,
        "maintenance_alerts": true,
        "weather_warnings": true
    }'::jsonb,
    
    -- Privacy preferences matching frontend interface
    privacy_preferences JSONB DEFAULT '{
        "profile_visibility": "public",
        "location_sharing": true,
        "activity_tracking": true,
        "data_collection": true
    }'::jsonb,
    
    -- Display preferences matching frontend interface
    display_preferences JSONB DEFAULT '{
        "theme": "system",
        "font_size": "medium",
        "language": "en",
        "high_contrast": false,
        "reduced_motion": false
    }'::jsonb,
    
    -- Regional preferences matching frontend interface
    regional_preferences JSONB DEFAULT '{
        "currency": "USD",
        "units": "imperial",
        "timezone": "America/New_York",
        "date_format": "MM/DD/YYYY"
    }'::jsonb,
    
    -- PAM preferences with voice_enabled: true by default
    pam_preferences JSONB DEFAULT '{
        "voice_enabled": true,
        "proactive_suggestions": true,
        "response_style": "balanced",
        "expertise_level": "intermediate",
        "knowledge_sources": true
    }'::jsonb,
    
    -- Integration preferences matching frontend interface
    integration_preferences JSONB DEFAULT '{
        "shop_travel_integration": true,
        "auto_add_purchases_to_storage": false
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop any existing policies (clean slate)
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_read_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_insert_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_update_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_delete_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_select_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_delete_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_select_policy" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert_policy" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update_policy" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_delete_policy" ON public.user_settings;

-- 4. Create simple, effective RLS policies
CREATE POLICY "user_settings_select_policy" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert_policy" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update_policy" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_delete_policy" ON public.user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

-- 6. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_created_at ON public.user_settings(created_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_notification_prefs ON public.user_settings USING GIN (notification_preferences);
CREATE INDEX IF NOT EXISTS idx_user_settings_privacy_prefs ON public.user_settings USING GIN (privacy_preferences);
CREATE INDEX IF NOT EXISTS idx_user_settings_display_prefs ON public.user_settings USING GIN (display_preferences);
CREATE INDEX IF NOT EXISTS idx_user_settings_pam_prefs ON public.user_settings USING GIN (pam_preferences);

-- 7. Add update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_settings_updated_at_trigger ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at_trigger
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- 8. Enhance existing affiliate_sales table with missing columns
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'product_name') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN product_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'product_url') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN product_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'amount') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN amount DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'commission') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN commission DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'category') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN category TEXT;
    END IF;
END $$;

-- 9. Enhance existing user_wishlists table with missing columns
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'product_id') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN product_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'product_name') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN product_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'price') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN price DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'category') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN category TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'notes') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN notes TEXT;
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION QUERIES (Run these after applying the migration)
-- =============================================================================

-- Check if user_settings table was created successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
ORDER BY ordinal_position;

-- Check RLS policies on user_settings
SELECT 
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_settings';

-- Verify table exists and is accessible
SELECT COUNT(*) as table_exists 
FROM information_schema.tables 
WHERE table_name = 'user_settings' AND table_schema = 'public';

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
-- If all queries above run without errors, the user_settings table has been
-- created successfully and the settings loading issues should be resolved.
-- 
-- The backend will now be able to:
-- ✅ Create default user settings 
-- ✅ Load user settings for all sections
-- ✅ Update user preferences
-- ✅ Support PAM voice settings (enabled by default)
-- ✅ Handle knowledge bucket creation
-- =============================================================================