
-- Create function for semantic search of knowledge chunks
CREATE OR REPLACE FUNCTION public.search_knowledge_chunks(
  user_id UUID,
  query_embedding vector(1536),
  match_count INTEGER DEFAULT 3,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id UUID,
  content TEXT,
  document_name TEXT,
  similarity FLOAT,
  chunk_metadata JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    c.id as chunk_id,
    c.content,
    d.filename as document_name,
    (1 - (c.embedding <=> query_embedding)) as similarity,
    c.chunk_metadata
  FROM user_knowledge_chunks c
  JOIN user_knowledge_documents d ON c.document_id = d.id
  WHERE 
    c.user_id = search_knowledge_chunks.user_id
    AND c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
