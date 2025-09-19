-- Fix user_settings RLS Policies
-- Since auth.uid() IS working (confirmed by JWT test), create proper user-specific policies
-- Date: 2025-09-16

-- Test current auth status (should show user ID now)
SELECT
    auth.uid() as current_user_id,
    auth.role() as current_role,
    CASE WHEN auth.uid() IS NULL THEN 'BROKEN' ELSE 'WORKING' END as auth_status;

-- Enable RLS on tables that need it
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Grant basic permissions to authenticated users
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_trips TO authenticated;
GRANT ALL ON public.expenses TO authenticated;
GRANT ALL ON public.budgets TO authenticated;

-- Remove any existing conflicting policies
DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can manage own trips" ON public.user_trips;
DROP POLICY IF EXISTS "Users can manage their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can manage their own budgets" ON public.budgets;

-- Remove temporary policies if they exist
DROP POLICY IF EXISTS "TEMP: Allow authenticated users access to settings" ON public.user_settings;
DROP POLICY IF EXISTS "TEMP: Allow authenticated users access to subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "TEMP: Allow authenticated users access to trips" ON public.user_trips;
DROP POLICY IF EXISTS "TEMP: Allow authenticated users access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "TEMP: Allow authenticated users access to budgets" ON public.budgets;

-- Create proper user-specific RLS policies (since auth.uid() works)
CREATE POLICY "Users can manage their own settings" ON public.user_settings
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscriptions" ON public.user_subscriptions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own trips" ON public.user_trips
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own expenses" ON public.expenses
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own budgets" ON public.budgets
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Test the new policies by trying to access user_settings
SELECT
    'user_settings' as table_name,
    COUNT(*) as accessible_rows,
    'Should show your settings if policy works' as status
FROM public.user_settings
WHERE auth.uid() = user_id;

-- Show current auth status
SELECT
    auth.uid() as user_id,
    'RLS policies updated' as status,
    'Try accessing user_settings in the app now' as next_step;

-- Final status message
DO $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        RAISE NOTICE '✅ PROPER RLS POLICIES APPLIED';
        RAISE NOTICE '🔐 auth.uid() is working: %', auth.uid();
        RAISE NOTICE '🎯 User-specific policies are now active';
        RAISE NOTICE '✅ Users can only access their own data';
        RAISE NOTICE '🧪 Test the app - user_settings should work now';
    ELSE
        RAISE NOTICE '❌ WARNING: auth.uid() is still NULL';
        RAISE NOTICE '⚠️  This means the policies might not work as expected';
        RAISE NOTICE '🔧 You may need to run the emergency fix instead';
    END IF;
END $$;