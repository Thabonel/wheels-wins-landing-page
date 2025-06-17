
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { documentId } = await req.json();
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all chunks for this document
    const { data: chunks, error: chunksError } = await supabase
      .from('user_knowledge_chunks')
      .select('*')
      .eq('document_id', documentId)
      .is('embedding', null);

    if (chunksError) {
      console.error('Error fetching chunks:', chunksError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch chunks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating embeddings for ${chunks.length} chunks`);

    // Process chunks in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (chunk) => {
        try {
          // Call OpenAI embeddings API
          const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: chunk.content,
              encoding_format: 'float'
            }),
          });

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
          }

          const result = await response.json();
          const embedding = result.data[0].embedding;

          // Update chunk with embedding
          const { error: updateError } = await supabase
            .from('user_knowledge_chunks')
            .update({ embedding })
            .eq('id', chunk.id);

          if (updateError) {
            console.error('Error updating chunk embedding:', updateError);
          }
        } catch (error) {
          console.error(`Error processing chunk ${chunk.id}:`, error);
        }
      }));

      // Small delay between batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('Embeddings generation completed');

    return new Response(
      JSON.stringify({ success: true, processed: chunks.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
