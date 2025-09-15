-- Create income_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.income_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT DEFAULT 'income',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for income_entries
CREATE POLICY "Users can view their own income entries"
ON public.income_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own income entries"
ON public.income_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income entries"
ON public.income_entries
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income entries"
ON public.income_entries
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_income_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_income_entries_updated_at
  BEFORE UPDATE ON public.income_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_income_entries_updated_at();