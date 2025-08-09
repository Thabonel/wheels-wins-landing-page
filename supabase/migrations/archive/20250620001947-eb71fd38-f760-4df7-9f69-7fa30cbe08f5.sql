
-- Create user_shopping_behavior table to store detailed shopping behavior analytics
CREATE TABLE IF NOT EXISTS public.user_shopping_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_views JSONB DEFAULT '[]'::jsonb,
  category_browsing JSONB DEFAULT '[]'::jsonb,
  price_preferences JSONB DEFAULT '[]'::jsonb,
  purchase_patterns JSONB DEFAULT '[]'::jsonb,
  click_through_rates JSONB DEFAULT '[]'::jsonb,
  seasonal_preferences JSONB DEFAULT '[]'::jsonb,
  conversion_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on the table
ALTER TABLE public.user_shopping_behavior ENABLE ROW LEVEL SECURITY;

-- Create policies for user_shopping_behavior
CREATE POLICY "Users can view their own shopping behavior" 
  ON public.user_shopping_behavior 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shopping behavior" 
  ON public.user_shopping_behavior 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping behavior" 
  ON public.user_shopping_behavior 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create trigger to update the updated_at timestamp
CREATE TRIGGER update_user_shopping_behavior_updated_at 
  BEFORE UPDATE ON public.user_shopping_behavior
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_user_shopping_behavior_user_id ON public.user_shopping_behavior(user_id);
CREATE INDEX idx_user_shopping_behavior_updated_at ON public.user_shopping_behavior(updated_at);
