-- Create trip_templates table
CREATE TABLE IF NOT EXISTS public.trip_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  is_public BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for trip_templates
CREATE POLICY "Users can view public trip templates" 
ON public.trip_templates 
FOR SELECT 
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own trip templates" 
ON public.trip_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own trip templates" 
ON public.trip_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip templates" 
ON public.trip_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_trip_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trip_templates_updated_at
BEFORE UPDATE ON public.trip_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_trip_templates_updated_at();

-- Create function to increment template usage
CREATE OR REPLACE FUNCTION public.increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.trip_templates 
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;