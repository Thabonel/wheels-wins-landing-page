-- Create a security definer function to get user id from auth
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
  SELECT id FROM public.users WHERE email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  );
$$;

-- Fix RLS policies for user_subscriptions table using the helper function
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.user_subscriptions;

-- Create new policies using the helper function
CREATE POLICY "Users can view their own subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (user_id = public.get_user_id_from_auth());

CREATE POLICY "Users can insert their own subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (user_id = public.get_user_id_from_auth());

CREATE POLICY "Users can update their own subscriptions" 
ON public.user_subscriptions 
FOR UPDATE 
USING (user_id = public.get_user_id_from_auth())
WITH CHECK (user_id = public.get_user_id_from_auth());

CREATE POLICY "Users can delete their own subscriptions" 
ON public.user_subscriptions 
FOR DELETE 
USING (user_id = public.get_user_id_from_auth());