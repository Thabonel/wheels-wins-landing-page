
-- Create RLS policies for drawers table
CREATE POLICY "Users can view their own drawers" ON public.drawers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drawers" ON public.drawers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drawers" ON public.drawers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drawers" ON public.drawers
    FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on drawers table
ALTER TABLE public.drawers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for items table
CREATE POLICY "Users can view items in their drawers" ON public.items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.drawers 
            WHERE drawers.id = items.drawer_id 
            AND drawers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert items in their drawers" ON public.items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.drawers 
            WHERE drawers.id = items.drawer_id 
            AND drawers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items in their drawers" ON public.items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.drawers 
            WHERE drawers.id = items.drawer_id 
            AND drawers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete items in their drawers" ON public.items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.drawers 
            WHERE drawers.id = items.drawer_id 
            AND drawers.user_id = auth.uid()
        )
    );

-- Enable RLS on items table
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
