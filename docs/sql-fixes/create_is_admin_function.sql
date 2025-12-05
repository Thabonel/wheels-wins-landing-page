CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
SELECT
  proname as function_name,
  prosecdef as security_definer,
  provolatile as volatility,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'is_admin'
AND pronamespace = 'public'::regnamespace;
