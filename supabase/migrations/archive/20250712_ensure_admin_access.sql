-- Ensure thabonel0@gmail.com has permanent admin access
-- This migration guarantees admin access regardless of other issues

-- First, get the user_id for thabonel0@gmail.com from auth.users
-- Insert or update admin record to ensure permanent access
INSERT INTO public.admin_users (user_id, email, role, status, created_at, updated_at, region, permissions)
SELECT 
    id as user_id,
    email,
    'admin' as role,
    'active' as status,
    COALESCE((SELECT created_at FROM public.admin_users WHERE user_id = auth.users.id), NOW()) as created_at,
    NOW() as updated_at,
    COALESCE((SELECT region FROM public.admin_users WHERE user_id = auth.users.id), 'Global') as region,
    COALESCE((SELECT permissions FROM public.admin_users WHERE user_id = auth.users.id), '{}') as permissions
FROM auth.users 
WHERE email = 'thabonel0@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
    role = 'admin',
    status = 'active',
    updated_at = NOW(),
    email = EXCLUDED.email;

-- Ensure the admin_users table has proper indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role_status ON public.admin_users(role, status);

-- Create a function to ensure admin access (backup mechanism)
CREATE OR REPLACE FUNCTION public.ensure_admin_access(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    CASE 
      WHEN check_email = 'thabonel0@gmail.com' THEN true
      ELSE EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE email = check_email 
        AND role = 'admin' 
        AND status = 'active'
      )
    END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.ensure_admin_access(text) TO authenticated, anon;

-- Update RLS policy to use the new function
DROP POLICY IF EXISTS "Super admin bypass" ON public.admin_users;
CREATE POLICY "Super admin bypass" ON public.admin_users
    FOR ALL
    TO authenticated
    USING (
        auth.email() = 'thabonel0@gmail.com' 
        OR auth.uid()::text = user_id
        OR ensure_admin_access(auth.email())
    )
    WITH CHECK (
        auth.email() = 'thabonel0@gmail.com' 
        OR auth.uid()::text = user_id
        OR ensure_admin_access(auth.email())
    );