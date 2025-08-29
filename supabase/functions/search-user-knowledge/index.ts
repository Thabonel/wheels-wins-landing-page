
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

    const { userId, query, limit = 3 } = await req.json();
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!userId || !query) {
      return new Response(
        JSON.stringify({ error: 'User ID and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching knowledge for user:', userId, 'query:', query);

    // Generate embedding for the search query
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float'
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const embeddingResult = await response.json();
    const queryEmbedding = embeddingResult.data[0].embedding;

    // Search for similar chunks using pgvector
    const { data: results, error: searchError } = await supabase.rpc('search_knowledge_chunks', {
      user_id: userId,
      query_embedding: queryEmbedding,
      match_count: limit,
      similarity_threshold: 0.7
    });

    if (searchError) {
      console.error('Search error:', searchError);
      return new Response(
        JSON.stringify({ error: 'Search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found', results?.length || 0, 'matching chunks');

    return new Response(
      JSON.stringify({ results: results || [] }),
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
