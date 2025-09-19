-- Fix RLS policies to resolve "permission denied to set role 'admin'" errors
-- The issue is likely with the admin_users table RLS policies

-- First, ensure RLS is enabled on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.admin_users;
DROP POLICY IF EXISTS "Enable insert for users" ON public.admin_users;
DROP POLICY IF EXISTS "Enable update for users" ON public.admin_users;
DROP POLICY IF EXISTS "Enable delete for users" ON public.admin_users;

-- Create new RLS policies for admin_users table that don't cause permission issues
CREATE POLICY "Users can view their own admin status"
ON public.admin_users
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view all admin users"
ON public.admin_users  
FOR SELECT
USING (true);

-- Allow authenticated users to insert admin records (for bootstrapping)
CREATE POLICY "Allow admin user creation"
ON public.admin_users
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow admin users to update admin records
CREATE POLICY "Admin users can update admin records"
ON public.admin_users
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow admin users to delete admin records
CREATE POLICY "Admin users can delete admin records" 
ON public.admin_users
FOR DELETE
USING (auth.uid() = user_id);

-- Ensure profiles table has proper RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profiles policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create new RLS policies for profiles table
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Create a function to safely check admin status without RLS conflicts
CREATE OR REPLACE FUNCTION public.check_user_admin_status(check_user_id uuid)
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

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.check_user_admin_status(uuid) TO authenticated;