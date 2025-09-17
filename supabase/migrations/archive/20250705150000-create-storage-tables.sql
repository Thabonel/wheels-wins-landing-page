-- Create storage_categories table
CREATE TABLE public.storage_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.storage_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own categories" ON public.storage_categories
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create storage_locations table
CREATE TABLE public.storage_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own locations" ON public.storage_locations
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create storage_items table
CREATE TABLE public.storage_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    category_id uuid REFERENCES public.storage_categories(id),
    location_id uuid REFERENCES public.storage_locations(id),
    quantity integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.storage_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own storage items" ON public.storage_items
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_storage_categories_user_id ON public.storage_categories(user_id);
CREATE INDEX idx_storage_locations_user_id ON public.storage_locations(user_id);
CREATE INDEX idx_storage_items_user_id ON public.storage_items(user_id);
