-- Simplify RLS policy for transition_profiles SELECT
-- Remove unnecessary text casting that may cause auth issues

DROP POLICY IF EXISTS "Users can view own transition profiles" ON public.transition_profiles;

CREATE POLICY "Users can view own transition profiles"
ON public.transition_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
