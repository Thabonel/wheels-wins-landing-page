-- Create qa_issues table for team QA tracking
CREATE TABLE IF NOT EXISTS public.qa_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  priority TEXT CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')) DEFAULT 'Medium',
  category TEXT CHECK (category IN ('UI/Design', 'Functionality', 'Content', 'Performance', 'Integration', 'Other')) DEFAULT 'Other',
  status TEXT CHECK (status IN ('Open', 'Closed')) DEFAULT 'Open',
  notes TEXT,
  screenshot_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qa_issues_status ON public.qa_issues(status);
CREATE INDEX IF NOT EXISTS idx_qa_issues_priority ON public.qa_issues(priority);
CREATE INDEX IF NOT EXISTS idx_qa_issues_category ON public.qa_issues(category);
CREATE INDEX IF NOT EXISTS idx_qa_issues_created_by ON public.qa_issues(created_by);
CREATE INDEX IF NOT EXISTS idx_qa_issues_created_at ON public.qa_issues(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.qa_issues ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view qa_issues" ON public.qa_issues;
DROP POLICY IF EXISTS "Authenticated users can insert qa_issues" ON public.qa_issues;
DROP POLICY IF EXISTS "Users can update qa_issues" ON public.qa_issues;
DROP POLICY IF EXISTS "Users can delete their own qa_issues" ON public.qa_issues;

-- Policy: Anyone authenticated can view all issues
CREATE POLICY "Authenticated users can view qa_issues" ON public.qa_issues
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Anyone authenticated can insert issues
CREATE POLICY "Authenticated users can insert qa_issues" ON public.qa_issues
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own issues or any issue if they're updating it
CREATE POLICY "Users can update qa_issues" ON public.qa_issues
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() = updated_by);

-- Policy: Users can delete their own issues
CREATE POLICY "Users can delete their own qa_issues" ON public.qa_issues
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on row update
CREATE TRIGGER update_qa_issues_updated_at BEFORE UPDATE ON public.qa_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for QA screenshots (if not exists)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'qa-screenshots',
  'qa-screenshots', 
  false,
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for QA screenshots
CREATE POLICY "Authenticated users can upload qa screenshots" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'qa-screenshots');

CREATE POLICY "Authenticated users can view qa screenshots" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'qa-screenshots');

CREATE POLICY "Users can update their own qa screenshots" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'qa-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own qa screenshots" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'qa-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);