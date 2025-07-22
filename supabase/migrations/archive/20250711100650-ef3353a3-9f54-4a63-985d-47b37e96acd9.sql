-- Fix admin system by ensuring your admin user exists and updating RLS policies

-- First, ensure you (thabonel0@gmail.com) are properly set as an admin
INSERT INTO public.admin_users (user_id, email, role, status, created_at, updated_at)
SELECT 
  auth.users.id,
  'thabonel0@gmail.com',
  'admin',
  'active',
  NOW(),
  NOW()
FROM auth.users 
WHERE auth.users.email = 'thabonel0@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  status = 'active',
  email = 'thabonel0@gmail.com',
  updated_at = NOW();

-- Create a simple function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND status = 'active'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- Update RLS policies to use the new function and avoid role switching
DROP POLICY IF EXISTS "Admins can manage admin_users via function" ON admin_users;
DROP POLICY IF EXISTS "Service role can manage admin_users" ON admin_users;

-- Create new admin policies that don't try to switch roles
CREATE POLICY "Current user can view admin_users if they are admin"
ON admin_users FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "Current user can manage admin_users if they are admin"
ON admin_users FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- Update content_moderation policies
DROP POLICY IF EXISTS "Admins can manage content moderation" ON content_moderation;
DROP POLICY IF EXISTS "Service role can manage content_moderation" ON content_moderation;

CREATE POLICY "Current user can manage content_moderation if they are admin"
ON content_moderation FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- Make sure profiles table has proper policies for admin access
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

-- Update other tables that might need admin access
CREATE POLICY "Admins can view all expenses"
ON expenses FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

-- Create support_tickets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  status text DEFAULT 'open',
  priority text DEFAULT 'medium',
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Enable RLS on support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Add policies for support_tickets
CREATE POLICY "Users can view their own tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "Admins can manage all tickets"
ON support_tickets FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- Create shop_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  total numeric DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT NOW()
);

-- Enable RLS and add policies
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all orders"
ON shop_orders FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

-- Create basic analytics tables if they don't exist
CREATE TABLE IF NOT EXISTS public.pam_analytics_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  intent text,
  response_time_ms integer,
  timestamp timestamptz DEFAULT NOW()
);

ALTER TABLE public.pam_analytics_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all PAM analytics"
ON pam_analytics_logs FOR SELECT
TO authenticated
USING (public.is_current_user_admin());