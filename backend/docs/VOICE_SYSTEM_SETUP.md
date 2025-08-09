# Voice System Setup and Configuration

This document explains how to set up and configure the voice features in the Wheels and Wins application.

## Overview

The voice system consists of three main components:

1. **Speech-to-Text (STT)** - Whisper integration for transcribing user audio
2. **Large Language Model (LLM)** - PAM processing via SimplePamService
3. **Text-to-Speech (TTS)** - Multiple TTS options for audio generation

## Voice Endpoints

### `/api/v1/pam/voice` - Complete Voice Pipeline

**Purpose**: Full STT→LLM→TTS pipeline for voice conversations with PAM

**Request Format**:
```bash
POST /api/v1/pam/voice
Content-Type: multipart/form-data

Form field: audio (audio file upload)
```

**Response Format**:
- **Success (Audio)**: Returns synthesized audio with headers:
  ```
  Content-Type: audio/mpeg or audio/wav
  X-Transcription: Original user speech transcription
  X-Response-Text: PAM's text response
  X-Pipeline: STT→LLM→TTS processing method used
  ```
- **Fallback (JSON)**: If TTS fails, returns JSON with text response:
  ```json
  {
    "text": "user transcription",
    "response": "PAM response text", 
    "voice_ready": false,
    "pipeline": "STT→LLM→TTS-Failed"
  }
  ```

### `/api/v1/voice` - Direct TTS

**Purpose**: Direct text-to-speech synthesis via Supabase function

**Request Format**:
```json
{
  "text": "Text to synthesize"
}
```

**Response Format**:
```json
{
  "audio": [array of integer audio samples],
  "duration": 1500,
  "cached": false
}
```

## TTS Configuration Options

The system supports multiple TTS backends with automatic fallback:

### 1. Local TTS Service (Primary)
- **Location**: `app/services/tts/tts_service.py`
- **Features**: Streaming TTS, voice profiles, caching
- **Initialization**: Auto-initialized on startup
- **Fallback**: If initialization fails, falls back to Supabase TTS

### 2. Supabase Function TTS (Fallback)
- **Function Name**: `nari-dia-tts`
- **Provider**: HuggingFace API
- **Response**: Integer array audio data

## Supabase TTS Function Setup

### 1. Deploy the Function

Create a new Supabase Edge Function:

```bash
supabase functions new nari-dia-tts
```

### 2. Function Implementation

**File**: `supabase/functions/nari-dia-tts/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

interface TTSRequest {
  text: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text }: TTSRequest = await req.json()
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call HuggingFace TTS API
    const huggingFaceResponse = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/speecht5_tts',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('HUGGINGFACE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            speaker_embeddings: "default"  
          }
        }),
      }
    )

    if (!huggingFaceResponse.ok) {
      throw new Error(`HuggingFace API error: ${huggingFaceResponse.status}`)
    }

    const audioBuffer = await huggingFaceResponse.arrayBuffer()
    const audioArray = Array.from(new Int16Array(audioBuffer))
    
    return new Response(
      JSON.stringify({
        audio: audioArray,
        duration: Math.floor((audioArray.length / 16000) * 1000), // Assume 16kHz
        cached: false
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
```

### 3. CORS Configuration

**File**: `supabase/functions/_shared/cors.ts`

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
```

### 4. Deploy and Configure

```bash
# Deploy the function
supabase functions deploy nari-dia-tts

# Set environment variables
supabase secrets set HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

## Environment Variables

### Backend Configuration

Add to your `.env` file:

```bash
# Supabase Configuration (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# HuggingFace API (for Supabase function)
HUGGINGFACE_API_KEY=your_huggingface_api_key_here

# OpenAI (for Whisper STT and PAM LLM)
OPENAI_API_KEY=your_openai_api_key_here
```

### Frontend Configuration

Add to your frontend `.env` file:

```bash
# Supabase (for function calls)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend URL
VITE_BACKEND_URL=https://your-backend-url.com
```

## API Keys Required

### 1. HuggingFace API Key
- **Purpose**: Text-to-speech via Supabase function
- **Get it**: https://huggingface.co/settings/tokens
- **Permissions**: Inference API access

### 2. OpenAI API Key  
- **Purpose**: Whisper STT and PAM LLM processing
- **Get it**: https://platform.openai.com/api-keys
- **Models used**: `whisper-1`, `gpt-4`

### 3. Supabase Keys
- **Purpose**: Database access and function calls
- **Get them**: Your Supabase project dashboard
- **Required**: 
  - Anon key (public)
  - Service key (server-side only)

## Testing the Voice System

### 1. Backend Tests

```bash
# Run voice endpoint tests
cd backend
RUN_API_TESTS=1 pytest tests/api/test_pam_voice_endpoint.py -v
RUN_API_TESTS=1 pytest tests/api/test_voice_endpoint.py -v
```

### 2. Frontend Testing

1. Open the application
2. Click the PAM chat bubble
3. Click the microphone button
4. Grant microphone permissions
5. Record a short message
6. Verify audio playback of PAM's response

### 3. Manual API Testing

```bash
# Test direct TTS
curl -X POST "https://your-backend-url.com/api/v1/voice" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test"}'

# Test voice pipeline (requires audio file)
curl -X POST "https://your-backend-url.com/api/v1/pam/voice" \
  -H "Authorization: Bearer your-jwt-token" \
  -F "audio=@test_audio.wav"
```

## Troubleshooting

### Common Issues

1. **"TTS service not available"**
   - Check if HuggingFace API key is set
   - Verify Supabase function is deployed
   - Check function logs: `supabase functions logs nari-dia-tts`

2. **"No speech detected"**
   - Ensure audio file contains actual speech
   - Check audio format (WAV/MP3 supported)
   - Verify OpenAI API key for Whisper

3. **"Microphone permission denied"**
   - Check browser permissions
   - Ensure HTTPS (required for microphone access)
   - Try different browser

4. **"Audio playback failed"**
   - Check browser audio permissions
   - Verify audio format support
   - Check network connectivity

### Debug Mode

Enable debug logging:

```bash
# Backend
export LOG_LEVEL=DEBUG

# Frontend (browser console)
localStorage.setItem('debug', 'pam:voice')
```

## Performance Optimization

### 1. TTS Caching
- Local TTS service includes automatic caching
- Supabase function responses can be cached client-side
- Consider implementing Redis cache for production

### 2. Audio Compression
- Use MP3 for smaller file sizes
- Consider voice compression for mobile users
- Implement adaptive bitrate based on connection

### 3. Latency Reduction
- Use streaming TTS for faster response times
- Implement WebSocket for real-time voice chat
- Consider edge deployment for TTS services

## Security Considerations

1. **API Key Security**
   - Never expose API keys in frontend code
   - Use environment variables for all keys
   - Rotate keys regularly

2. **Audio Data Privacy**
   - Audio is processed server-side only
   - No permanent storage of voice recordings
   - Implement user consent for voice features

3. **Rate Limiting**
   - Implement rate limits on voice endpoints
   - Prevent abuse of TTS services
   - Monitor API usage and costs

## Cost Management

### API Usage Costs

1. **HuggingFace Inference API**
   - Free tier: 1000 requests/month
   - Pay-per-use after free tier
   - Cost: ~$0.001-0.01 per request

2. **OpenAI API**
   - Whisper: $0.006 per minute
   - GPT-4: ~$0.03-0.06 per 1K tokens
   - Monitor usage via OpenAI dashboard

3. **Supabase**
   - Edge Functions: 500K executions/month (free)
   - Database requests included in plan
   - Additional costs for high usage

### Cost Optimization Tips

1. Implement request caching
2. Use shorter audio clips when possible
3. Monitor and set usage alerts
4. Consider local TTS models for high-volume use
5. Implement user quotas if needed

## Future Enhancements

1. **Voice Profiles**: User-specific voice preferences
2. **Multi-language Support**: TTS in multiple languages
3. **Voice Cloning**: Custom voice synthesis
4. **Real-time Voice Chat**: WebSocket-based streaming
5. **Voice Commands**: Hands-free PAM control
6. **Noise Reduction**: Audio preprocessing for better STT
7. **Voice Biometrics**: User authentication via voice

---

For additional support or questions about the voice system setup, please refer to the main project documentation or contact the development team.