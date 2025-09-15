-- Create product_views table for tracking product page views
CREATE TABLE public.product_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    view_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    view_end TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    category TEXT,
    price DECIMAL(10,2),
    region TEXT,
    context_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX idx_product_views_user_id ON public.product_views(user_id);
CREATE INDEX idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX idx_product_views_created_at ON public.product_views(created_at);

-- Enable Row Level Security
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own product views" ON public.product_views
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product views" ON public.product_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);
