-- Drop all existing profiles RLS policies to clean up conflicts
DROP POLICY IF EXISTS "Admins can delete users" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all users" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile reads" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles data" ON public.profiles;
DROP POLICY IF EXISTS "Service role can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "User can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles for admin checks" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profile_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profile_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_own" ON public.profiles;
DROP POLICY IF EXISTS "service_role_bypass_profiles" ON public.profiles;

-- Create clean, simple RLS policies for profiles
CREATE POLICY "Users can read their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (public.is_admin_user(auth.uid()));