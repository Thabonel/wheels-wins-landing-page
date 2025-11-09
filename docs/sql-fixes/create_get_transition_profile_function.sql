CREATE OR REPLACE FUNCTION get_transition_profile()
RETURNS transition_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT *
    FROM transition_profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;
