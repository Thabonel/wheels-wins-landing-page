
-- Create user shopping profiles table
CREATE TABLE IF NOT EXISTS public.user_shopping_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    travel_style TEXT DEFAULT 'budget' CHECK (travel_style IN ('budget', 'mid-range', 'luxury', 'adventure', 'business', 'leisure')),
    price_sensitivity DECIMAL(3,2) DEFAULT 0.5 CHECK (price_sensitivity >= 0 AND price_sensitivity <= 1),
    preferred_categories JSONB DEFAULT '[]'::jsonb,
    seasonal_preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create product interaction tracking table
CREATE TABLE IF NOT EXISTS public.product_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'click', 'add_to_cart', 'purchase', 'favorite', 'share')),
    duration_seconds INTEGER DEFAULT 0,
    context_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create personalized recommendations table
CREATE TABLE IF NOT EXISTS public.personalized_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id TEXT NOT NULL,
    recommendation_type TEXT DEFAULT 'general' CHECK (recommendation_type IN ('general', 'trending', 'seasonal', 'bundle', 'pam_pick')),
    confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create shopping session analytics table
CREATE TABLE IF NOT EXISTS public.shopping_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    total_views INTEGER DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    items_purchased INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    context_data JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_interactions_user_id ON public.product_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_product_interactions_product_id ON public.product_interactions(product_id);
CREATE INDEX IF NOT EXISTS idx_product_interactions_created_at ON public.product_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_user_id ON public.personalized_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_expires_at ON public.personalized_recommendations(expires_at);

-- Enable RLS
ALTER TABLE public.user_shopping_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalized_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own shopping profile" ON public.user_shopping_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping profile" ON public.user_shopping_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own product interactions" ON public.product_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product interactions" ON public.product_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own recommendations" ON public.personalized_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own shopping sessions" ON public.shopping_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping sessions" ON public.shopping_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update user shopping profile timestamp
CREATE OR REPLACE FUNCTION update_shopping_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating shopping profile timestamp
CREATE TRIGGER update_shopping_profile_updated_at
    BEFORE UPDATE ON public.user_shopping_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_shopping_profile_timestamp();
