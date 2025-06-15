
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing document:', documentId);

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('user_knowledge_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Document not found:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabase
      .from('user_knowledge_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('user-knowledge')
        .download(document.file_path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`);
      }

      // Extract text based on file type
      let extractedText = '';
      
      if (document.content_type === 'text/plain' || document.filename.endsWith('.txt')) {
        extractedText = await fileData.text();
      } else if (document.content_type === 'text/markdown' || document.filename.endsWith('.md')) {
        extractedText = await fileData.text();
      } else if (document.content_type === 'application/pdf') {
        // For PDF files, we would need a PDF processing library
        // For now, we'll mark it as failed and suggest text format
        throw new Error('PDF processing not yet implemented. Please convert to text format.');
      } else {
        throw new Error(`Unsupported file type: ${document.content_type}`);
      }

      console.log('Extracted text length:', extractedText.length);

      // Update document with extracted text
      await supabase
        .from('user_knowledge_documents')
        .update({ 
          extracted_text: extractedText,
          processing_status: 'completed'
        })
        .eq('id', documentId);

      // Create chunks
      const chunks = createSmartChunks(extractedText, document.filename);
      console.log('Created chunks:', chunks.length);

      // Insert chunks
      const chunkPromises = chunks.map((chunk, index) => 
        supabase
          .from('user_knowledge_chunks')
          .insert({
            document_id: documentId,
            user_id: document.user_id,
            chunk_index: index,
            content: chunk.content,
            token_count: chunk.token_count,
            chunk_metadata: chunk.metadata
          })
      );

      await Promise.all(chunkPromises);

      // Generate embeddings for chunks (we'll call another function for this)
      await supabase.functions.invoke('generate-embeddings', {
        body: { documentId }
      });

      console.log('Document processing completed successfully');

      return new Response(
        JSON.stringify({ success: true, chunks: chunks.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (processingError) {
      console.error('Processing error:', processingError);
      
      // Update status to failed
      await supabase
        .from('user_knowledge_documents')
        .update({ 
          processing_status: 'failed',
          metadata: { error: processingError.message }
        })
        .eq('id', documentId);

      return new Response(
        JSON.stringify({ error: processingError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function createSmartChunks(text: string, filename: string) {
  const chunks = [];
  const maxChunkSize = 1400;
  const overlapSize = 200;
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let currentTokenCount = 0;
  
  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokenCount(paragraph);
    
    // If adding this paragraph would exceed chunk size, save current chunk
    if (currentTokenCount + paragraphTokens > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        token_count: currentTokenCount,
        metadata: {
          source_file: filename,
          chunk_type: 'paragraph_boundary'
        }
      });
      
      // Start new chunk with overlap
      const overlapText = getLastWords(currentChunk, overlapSize);
      currentChunk = overlapText + '\n\n' + paragraph;
      currentTokenCount = estimateTokenCount(currentChunk);
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokenCount += paragraphTokens;
    }
  }
  
  // Add final chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      token_count: currentTokenCount,
      metadata: {
        source_file: filename,
        chunk_type: 'final'
      }
    });
  }
  
  return chunks;
}

function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

function getLastWords(text: string, maxTokens: number): string {
  const words = text.split(/\s+/);
  const targetWords = Math.ceil(maxTokens / 1.3); // Rough words to tokens ratio
  return words.slice(-targetWords).join(' ');
}
