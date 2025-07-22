-- Enable RLS on the drawers table
ALTER TABLE public.drawers ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own drawers
CREATE POLICY "Users can view their own drawers" 
ON public.drawers 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to create their own drawers
CREATE POLICY "Users can create their own drawers" 
ON public.drawers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own drawers
CREATE POLICY "Users can update their own drawers" 
ON public.drawers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own drawers
CREATE POLICY "Users can delete their own drawers" 
ON public.drawers 
FOR DELETE 
USING (auth.uid() = user_id);