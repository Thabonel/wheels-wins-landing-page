-- Fix admin_users RLS policies to remove problematic auth.role() calls
-- The auth.role() function tries to switch database roles which is causing permission errors

-- Drop the problematic policy that uses auth.role()
DROP POLICY IF EXISTS "Admins can manage admin_users" ON admin_users;

-- Create a new policy that uses the safer admin checking function
CREATE POLICY "Admins can manage admin_users" 
ON admin_users 
FOR ALL 
TO authenticated
USING (
  -- Current user can manage their own record OR current user is admin
  auth.uid() = user_id OR is_current_user_admin()
)
WITH CHECK (
  -- Current user can create/update their own record OR current user is admin  
  auth.uid() = user_id OR is_current_user_admin()
);

-- Also ensure we have policies that don't conflict
-- Drop duplicate policies if they exist
DROP POLICY IF EXISTS "Admin users can update admin records" ON admin_users;
DROP POLICY IF EXISTS "Admin users can delete admin records" ON admin_users;

-- Keep the service role policy but make sure it's clean
DROP POLICY IF EXISTS "Service role can manage admin_users" ON admin_users;
CREATE POLICY "Service role can manage admin_users"
ON admin_users 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure public read access is maintained for admin checking
DROP POLICY IF EXISTS "Public read access for admin checking" ON admin_users;
CREATE POLICY "Public read access for admin checking"
ON admin_users 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Remove duplicate policies
DROP POLICY IF EXISTS "Users can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Users can view their own admin status" ON admin_users;