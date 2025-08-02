
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TTSRequest {
  text: string;
  voice_type?: 'monologue' | 'dialogue';
  // Dia-specific parameters
  sampling_rate?: number;
  normalize?: boolean;
  format?: 'wav' | 'mp3';
  // Optional enhancement parameters
  enhance_audio?: boolean;
  remove_silence?: boolean;
}

interface TTSResponse {
  audio: number[];
  duration?: number;
  format: string;
  cached: boolean;
  metadata?: {
    sampling_rate: number;
    text_length: number;
    processing_time: number;
  };
}

interface ErrorResponse {
  error: string;
  details?: string;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now();

  try {
    // Validate request method
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed. Use POST.`)
    }

    // Parse and validate request body
    let requestBody: TTSRequest;
    try {
      requestBody = await req.json()
    } catch (parseError) {
      throw new Error('Invalid JSON in request body')
    }

    const { 
      text, 
      voice_type = 'monologue',
      sampling_rate = 22050,
      normalize = true,
      format = 'wav',
      enhance_audio = true,
      remove_silence = false
    } = requestBody;

    // Validate required parameters
    if (!text || typeof text !== 'string') {
      throw new Error('Text is required and must be a string')
    }

    if (text.length > 5000) {
      throw new Error('Text length exceeds maximum limit of 5000 characters')
    }

    if (text.trim().length === 0) {
      throw new Error('Text cannot be empty or only whitespace')
    }

    // Get API key from environment
    const apiKey = Deno.env.get('NARI_LABS_DIA_API_KEY')
    if (!apiKey) {
      throw new Error('Nari Labs Dia API key not configured. Please set NARI_LABS_DIA_API_KEY environment variable.')
    }

    console.log('🎙️ Generating voice with Nari Labs Dia model');
    console.log('📝 Text preview:', `${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    console.log('🔧 Voice type:', voice_type);
    console.log('⚙️ Format:', format);

    // Call Nari Labs Dia API through Segmind
    const segmindUrl = 'https://api.segmind.com/v1/dia';
    
    // Prepare request payload for Segmind Dia API
    const requestPayload = {
      text: text,
      voice_type: voice_type,
      sampling_rate: sampling_rate,
      normalize: normalize,
      format: format
    };

    console.log('🌐 Calling Segmind API:', segmindUrl);
    console.log('📦 Request payload:', JSON.stringify(requestPayload, null, 2));

    const response = await fetch(segmindUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,  // Segmind uses x-api-key header, not Authorization
        'Content-Type': 'application/json',
        'User-Agent': 'Wheels-Wins-TTS/1.0',
      },
      body: JSON.stringify(requestPayload),
    })

    // Check response status and handle errors
    if (!response.ok) {
      let errorDetails = 'Unknown error';
      try {
        const errorText = await response.text();
        console.error('❌ Segmind API error response:', errorText);
        
        // Try to parse error response as JSON
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson.error || errorJson.message || errorText;
        } catch {
          errorDetails = errorText;
        }
      } catch (readError) {
        console.error('❌ Could not read error response:', readError);
      }
      
      // Check for specific error conditions
      if (response.status === 401) {
        throw new Error('Authentication failed. Please check your Segmind API key.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 400) {
        throw new Error(`Bad request: ${errorDetails}`);
      } else {
        throw new Error(`API request failed with status ${response.status}: ${errorDetails}`);
      }
    }

    // Check remaining credits from response headers
    const remainingCredits = response.headers.get('x-remaining-credits');
    if (remainingCredits) {
      console.log('💳 Remaining Segmind credits:', remainingCredits);
    }

    // Handle audio response
    const audioBuffer = await response.arrayBuffer();
    const audioArray = new Uint8Array(audioBuffer);
    const processingTime = Date.now() - startTime;

    console.log('✅ Voice generation successful!');
    console.log('📊 Audio size:', audioArray.length, 'bytes');
    console.log('⏱️ Processing time:', processingTime, 'ms');

    // Estimate duration based on audio size and sample rate
    const estimatedDuration = Math.ceil((audioArray.length / 2) / sampling_rate); // Rough estimate for 16-bit audio

    const ttsResponse: TTSResponse = {
      audio: Array.from(audioArray),
      duration: estimatedDuration,
      format: format,
      cached: false,
      metadata: {
        sampling_rate: sampling_rate,
        text_length: text.length,
        processing_time: processingTime
      }
    };

    return new Response(
      JSON.stringify(ttsResponse),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Processing-Time': processingTime.toString(),
          'X-Audio-Size': audioArray.length.toString()
        },
      },
    )
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ TTS generation error:', error);
    console.error('⏱️ Failed after:', processingTime, 'ms');
    
    // Determine appropriate error status code
    let statusCode = 500;
    let errorMessage = error.message || 'Unknown error occurred';
    
    if (errorMessage.includes('Authentication failed') || errorMessage.includes('API key')) {
      statusCode = 401;
    } else if (errorMessage.includes('Rate limit')) {
      statusCode = 429;
    } else if (errorMessage.includes('Bad request') || errorMessage.includes('required') || errorMessage.includes('invalid')) {
      statusCode = 400;
    }
    
    const errorResponse: ErrorResponse = {
      error: errorMessage,
      details: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : undefined,
      timestamp: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        status: statusCode,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Processing-Time': processingTime.toString()
        },
      },
    )
  }
})

// Helper function to validate text content for TTS
function validateTTSText(text: string): { isValid: boolean; error?: string } {
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: 'Text must be a non-empty string' };
  }
  
  if (text.trim().length === 0) {
    return { isValid: false, error: 'Text cannot be empty or only whitespace' };
  }
  
  if (text.length > 5000) {
    return { isValid: false, error: 'Text exceeds maximum length of 5000 characters' };
  }
  
  // Check for potentially problematic characters
  const invalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
  if (invalidChars.test(text)) {
    return { isValid: false, error: 'Text contains invalid control characters' };
  }
  
  return { isValid: true };
}

// Helper function to enhance text for dialogue generation
function enhanceTextForDia(text: string, voiceType: 'monologue' | 'dialogue'): string {
  let enhancedText = text.trim();
  
  if (voiceType === 'dialogue') {
    // Add speaker tags if not present for dialogue
    if (!enhancedText.includes('[S1]') && !enhancedText.includes('[S2]')) {
      enhancedText = `[S1] ${enhancedText}`;
    }
  }
  
  // Ensure proper sentence endings
  if (!enhancedText.match(/[.!?]$/)) {
    enhancedText += '.';
  }
  
  return enhancedText;
}
