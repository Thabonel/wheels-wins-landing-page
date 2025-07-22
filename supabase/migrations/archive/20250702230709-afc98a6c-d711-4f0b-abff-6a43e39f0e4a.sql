-- Fix missing RLS policies for user_login_history and user_active_sessions

-- Add missing INSERT policy for user_login_history
CREATE POLICY "Users can insert their own login history" 
ON public.user_login_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add missing INSERT policy for user_active_sessions
CREATE POLICY "Users can insert their own active sessions" 
ON public.user_active_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admin policies for user_login_history
CREATE POLICY "Admins can read all login history" 
ON public.user_login_history 
FOR SELECT 
USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete login history" 
ON public.user_login_history 
FOR DELETE 
USING (is_admin_user(auth.uid()));

-- Admin policies for user_active_sessions  
CREATE POLICY "Admins can read all active sessions" 
ON public.user_active_sessions 
FOR SELECT 
USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete active sessions" 
ON public.user_active_sessions 
FOR DELETE 
USING (is_admin_user(auth.uid()));