-- Create storage system tables for wheels and wins storage functionality

-- Storage categories table
CREATE TABLE public.storage_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Storage locations table  
CREATE TABLE public.storage_locations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Storage items table
CREATE TABLE public.storage_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    category_id uuid REFERENCES public.storage_categories(id),
    location_id uuid REFERENCES public.storage_locations(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.storage_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for storage_categories
CREATE POLICY "Users can manage their own storage categories" ON public.storage_categories
FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for storage_locations  
CREATE POLICY "Users can manage their own storage locations" ON public.storage_locations
FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for storage_items
CREATE POLICY "Users can manage their own storage items" ON public.storage_items
FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_storage_categories_user_id ON public.storage_categories(user_id);
CREATE INDEX idx_storage_locations_user_id ON public.storage_locations(user_id);
CREATE INDEX idx_storage_items_user_id ON public.storage_items(user_id);
CREATE INDEX idx_storage_items_category_id ON public.storage_items(category_id);
CREATE INDEX idx_storage_items_location_id ON public.storage_items(location_id);

-- Add updated_at triggers
CREATE TRIGGER update_storage_categories_updated_at
    BEFORE UPDATE ON public.storage_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_storage_locations_updated_at
    BEFORE UPDATE ON public.storage_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_storage_items_updated_at
    BEFORE UPDATE ON public.storage_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();