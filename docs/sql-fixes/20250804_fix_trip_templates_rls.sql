-- Fix trip_templates RLS to allow anonymous users to view public templates
-- This fixes the issue where only 2 fallback templates show instead of all database templates

-- Enable RLS if not already enabled
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "authenticated_users_view_public_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "users_manage_own_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "users_create_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "service_role_full_access_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "Users can manage own templates" ON public.trip_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON public.trip_templates;

-- Create new comprehensive policies

-- 1. CRITICAL: Allow EVERYONE (including anonymous) to view public templates
CREATE POLICY "anyone_can_view_public_templates" 
ON public.trip_templates
FOR SELECT
TO public  -- This allows both authenticated and anonymous users
USING (is_public = true);

-- 2. Authenticated users can view their own private templates
CREATE POLICY "users_view_own_templates" 
ON public.trip_templates
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_public = true);

-- 3. Users can create templates
CREATE POLICY "users_create_templates" 
ON public.trip_templates
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. Users can update their own templates
CREATE POLICY "users_update_own_templates" 
ON public.trip_templates
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 5. Users can delete their own templates
CREATE POLICY "users_delete_own_templates" 
ON public.trip_templates
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 6. Service role has full access
CREATE POLICY "service_role_full_access" 
ON public.trip_templates
FOR ALL
TO service_role
USING (true);

-- Grant necessary permissions
GRANT SELECT ON public.trip_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.trip_templates TO authenticated;

-- Verify the templates exist and are public
DO $$
DECLARE
    template_count INTEGER;
    public_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count FROM public.trip_templates;
    SELECT COUNT(*) INTO public_count FROM public.trip_templates WHERE is_public = true;
    
    RAISE NOTICE 'Total templates in database: %', template_count;
    RAISE NOTICE 'Public templates available: %', public_count;
    
    -- If no templates exist, log a warning
    IF template_count = 0 THEN
        RAISE WARNING 'No trip templates found in database! You may need to run the seed data script.';
    ELSIF public_count = 0 THEN
        RAISE WARNING 'Templates exist but none are marked as public! Update is_public = true for templates to be visible.';
    END IF;
END $$;

-- Create a function to check template visibility for debugging
CREATE OR REPLACE FUNCTION check_template_visibility(check_user_id UUID DEFAULT NULL)
RETURNS TABLE(
    visibility_type TEXT,
    template_count BIGINT,
    example_names TEXT[]
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH visibility_check AS (
        SELECT 
            CASE 
                WHEN is_public = true THEN 'Public Templates'
                WHEN user_id = check_user_id THEN 'Your Private Templates'
                ELSE 'Not Visible'
            END as visibility_type,
            name
        FROM public.trip_templates
    )
    SELECT 
        visibility_type,
        COUNT(*) as template_count,
        ARRAY_AGG(name ORDER BY name LIMIT 5) as example_names
    FROM visibility_check
    WHERE visibility_type != 'Not Visible'
    GROUP BY visibility_type
    ORDER BY visibility_type;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_template_visibility(UUID) TO anon, authenticated;

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_templates_public_region ON public.trip_templates(is_public, tags) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_trip_templates_gin_tags ON public.trip_templates USING gin(tags);

-- Log current state
DO $$
DECLARE
    aus_templates INTEGER;
BEGIN
    -- Check for Australian templates specifically
    SELECT COUNT(*) INTO aus_templates 
    FROM public.trip_templates 
    WHERE is_public = true 
    AND tags @> ARRAY['australia'];
    
    RAISE NOTICE 'Australian public templates found: %', aus_templates;
    
    -- Show first 3 Australian templates
    RAISE NOTICE 'Sample Australian templates:';
    FOR r IN 
        SELECT name, category, tags 
        FROM public.trip_templates 
        WHERE is_public = true 
        AND tags @> ARRAY['australia']
        LIMIT 3
    LOOP
        RAISE NOTICE '  - %: % (tags: %)', r.name, r.category, r.tags;
    END LOOP;
END $$;