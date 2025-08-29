
-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Personal knowledge buckets for user-specific content
CREATE TABLE IF NOT EXISTS public.user_knowledge_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents uploaded by users
CREATE TABLE IF NOT EXISTS public.user_knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id UUID NOT NULL REFERENCES public.user_knowledge_buckets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content_type TEXT,
  file_size INTEGER,
  extracted_text TEXT,
  processing_status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chunked content with embeddings for semantic search
CREATE TABLE IF NOT EXISTS public.user_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.user_knowledge_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding vector(1536),
  chunk_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.user_knowledge_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_knowledge_buckets
CREATE POLICY "Users can manage their own knowledge buckets" ON public.user_knowledge_buckets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_knowledge_documents
CREATE POLICY "Users can manage their own knowledge documents" ON public.user_knowledge_documents
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_knowledge_chunks
CREATE POLICY "Users can manage their own knowledge chunks" ON public.user_knowledge_chunks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for user knowledge documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-knowledge', 'user-knowledge', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user knowledge documents
CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-knowledge' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'user-knowledge' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'user-knowledge' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-knowledge' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_knowledge_bucket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_knowledge_buckets_updated_at 
  BEFORE UPDATE ON public.user_knowledge_buckets
  FOR EACH ROW EXECUTE FUNCTION public.update_knowledge_bucket_timestamp();
