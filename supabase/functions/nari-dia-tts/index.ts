
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TTSRequest {
  text: string;
  temperature?: number;
  cfg_scale?: number;
  speed_factor?: number;
  max_new_tokens?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, temperature = 1.1, cfg_scale = 3, speed_factor = 0.96, max_new_tokens = 2048 }: TTSRequest = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    const apiKey = Deno.env.get('NARI_LABS_DIA_API_KEY')
    if (!apiKey) {
      throw new Error('Nari Labs Dia API key not configured')
    }

    console.log('Generating voice for text:', `${text.substring(0, 100)  }...`)

    // Call Nari Labs Dia API through Hugging Face
    const response = await fetch('https://api-inference.huggingface.co/models/nari-labs/Dia-1.6B', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          temperature,
          cfg_scale,
          speed_factor,
          max_new_tokens,
          return_full_text: false
        },
        options: {
          wait_for_model: true,
          use_cache: false
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Nari Labs API error:', errorText)
      throw new Error(`API request failed: ${response.status} ${errorText}`)
    }

    // Handle audio response
    const audioBuffer = await response.arrayBuffer()
    const audioArray = new Uint8Array(audioBuffer)

    console.log('Voice generation successful, audio size:', audioArray.length)

    return new Response(
      JSON.stringify({ 
        audio: Array.from(audioArray),
        duration: Math.ceil(text.length / 10), // Rough estimate
        cached: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('TTS generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
