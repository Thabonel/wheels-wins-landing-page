-- Create RPC for fetching personalized recommendations
CREATE OR REPLACE FUNCTION public.get_personalized_recommendations(
  p_user_id uuid,
  p_limit integer DEFAULT 9
)
RETURNS TABLE (
  id uuid,
  product_id text,
  recommendation_type text,
  confidence_score numeric,
  context jsonb,
  created_at timestamptz,
  expires_at timestamptz
) AS $$
  SELECT id, product_id, recommendation_type, confidence_score, context, created_at, expires_at
  FROM public.personalized_recommendations
  WHERE user_id = p_user_id
    AND expires_at > now()
  ORDER BY confidence_score DESC, created_at DESC
  LIMIT p_limit;
$$ LANGUAGE SQL STABLE;
