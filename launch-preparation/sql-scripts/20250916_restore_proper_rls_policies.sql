-- Restore Proper RLS Policies After Authentication Fix
-- Run this ONLY after confirming auth.uid() returns proper user ID
-- Date: 2025-09-16

-- First, test if auth.uid() is working
DO $$
DECLARE
    current_auth_uid uuid;
BEGIN
    SELECT auth.uid() INTO current_auth_uid;

    IF current_auth_uid IS NULL THEN
        RAISE EXCEPTION 'auth.uid() is still returning NULL. Do not run this script until authentication is fixed.';
    ELSE
        RAISE NOTICE '✅ auth.uid() is working. Current user: %', current_auth_uid;
    END IF;
END $$;

-- Remove temporary permissive policies and create proper user-specific policies
DROP POLICY IF EXISTS "Temp: Allow authenticated access to settings" ON public.user_settings;
CREATE POLICY "Users can manage their own settings" ON public.user_settings
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Temp: Allow authenticated access to subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON public.user_subscriptions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Temp: Allow authenticated access to trips" ON public.user_trips;
CREATE POLICY "Users can manage their own trips" ON public.user_trips
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Temp: Allow authenticated access to ratings" ON public.trip_template_ratings;
CREATE POLICY "Users can view all ratings and manage their own" ON public.trip_template_ratings
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (auth.uid() = user_id);

-- Create proper policies for other tables that were failing
CREATE POLICY "Users can manage their own expenses" ON public.expenses
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own budgets" ON public.budgets
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own medical info" ON public.user_medical_information
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own trip items" ON public.trip_items
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own storage items" ON public.storage_items
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Test the policies by trying to access data
SELECT
    'Policy test results' as test_type,
    COUNT(*) as accessible_settings
FROM public.user_settings
WHERE auth.uid() = user_id;

-- Final status message
DO $$
BEGIN
    RAISE NOTICE '✅ Proper RLS policies have been restored. Test with authenticated users to confirm access.';
END $$;