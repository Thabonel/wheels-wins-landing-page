# Deploy HuggingFace TTS Function to Supabase

## Option 1: Web Dashboard Deployment (Recommended)

Since Docker isn't available, you can deploy the function directly through the Supabase web dashboard:

### Steps:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select project: `wheels-wins-ai-marketing`

2. **Navigate to Edge Functions**
   - Click "Edge Functions" in the left sidebar
   - Click "Create Function"

3. **Create Function**
   - Function name: `nari-dia-tts`
   - Copy the entire code from: `supabase/functions/nari-dia-tts/index.ts`

4. **Deploy Function**
   - Paste the code into the editor
   - Click "Deploy Function"

## Option 2: Install Docker Desktop

If you prefer using CLI deployment:

1. **Install Docker Desktop**
   - Download: https://docs.docker.com/desktop/
   - Install and start Docker Desktop

2. **Deploy via CLI**
   ```bash
   cd /Users/thabonel/Documents/Wheels\ and\ Wins/wheels-wins-landing-page
   supabase functions deploy nari-dia-tts
   ```

## Verify Deployment

After deployment, verify with:
```bash
supabase functions list
```

You should see `nari-dia-tts` in the list.

## Test the Function

Test the deployed function:
```bash
curl -X POST 'https://kciuuxoqxfsogjuqflou.supabase.co/functions/v1/nari-dia-tts' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"text": "Hello, this is a test of the HuggingFace TTS system"}'
```

## Function Code (for web dashboard)

```typescript
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

    console.log('Generating voice for text:', `${text.substring(0, 100)}...`)

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
```