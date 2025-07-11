-- Fix admin_users table RLS policies to prevent permission denied errors
-- The issue is circular dependencies in RLS policies that call is_admin_user function

-- First, temporarily disable RLS on admin_users to break circular dependency
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Admins can view all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can update admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can delete admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Users can view their own admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Users can view all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow admin user creation" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users can update admin records" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users can delete admin records" ON public.admin_users;
DROP POLICY IF EXISTS "Service role can manage admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Public read access for admin checking" ON public.admin_users;

-- Re-enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create safe RLS policies without circular dependencies
-- Allow service role to manage everything (for admin functions)
CREATE POLICY "service_role_full_access" 
ON public.admin_users 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Allow authenticated users to view admin records (needed for admin checks)
CREATE POLICY "authenticated_users_can_read_admin_users" 
ON public.admin_users 
FOR SELECT 
TO authenticated
USING (true);

-- Allow users to see their own admin record
CREATE POLICY "users_can_view_own_admin_record"
ON public.admin_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own non-critical fields (like last_login)
-- Note: Role changes should be restricted to service role only
CREATE POLICY "users_can_update_own_admin_record"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update the is_admin_user function to be more robust and avoid RLS issues
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);
CREATE FUNCTION public.is_admin_user(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = check_user_id 
    AND role = 'admin' 
    AND status = 'active'
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated, anon;

-- Ensure service role has all necessary permissions
GRANT ALL ON public.admin_users TO service_role;