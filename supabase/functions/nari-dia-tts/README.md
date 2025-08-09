# Nari Labs Dia TTS Edge Function

## Overview

This Supabase Edge Function integrates with the Nari Labs Dia 1.6B Text-to-Speech model via the Segmind API platform. Dia is an advanced open-source TTS model capable of generating ultra-realistic dialogue with nonverbal cues and multi-speaker support.

## Features

- **Ultra-Realistic Voice Generation**: Powered by Nari Labs Dia 1.6B model
- **Multi-Speaker Dialogue**: Support for conversation generation with [S1], [S2] speaker tags
- **Nonverbal Vocal Cues**: Recognizes expressive cues like (laughs), (sighs), (clears throat), etc.
- **Flexible Audio Formats**: Support for WAV and MP3 output
- **Production-Ready**: Comprehensive error handling, validation, and monitoring
- **Performance Optimized**: Request/response timing and audio size tracking

## API Endpoint

```
POST /functions/v1/nari-dia-tts
```

## Authentication

The function requires a Segmind API key to be configured as an environment variable:

```bash
NARI_LABS_DIA_API_KEY=SG_your_segmind_api_key_here
```

## Request Format

### Headers
```
Content-Type: application/json
```

### Request Body

```typescript
interface TTSRequest {
  text: string;                    // Required: Text to convert to speech
  voice_type?: 'monologue' | 'dialogue';  // Optional: Type of voice generation
  sampling_rate?: number;          // Optional: Audio sampling rate (default: 22050)
  normalize?: boolean;             // Optional: Normalize audio output (default: true)
  format?: 'wav' | 'mp3';         // Optional: Audio format (default: 'wav')
  enhance_audio?: boolean;         // Optional: Audio enhancement (default: true)
  remove_silence?: boolean;        // Optional: Remove silence (default: false)
}
```

### Example Request

```javascript
const response = await fetch('/functions/v1/nari-dia-tts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: "Hello there! (laughs) How are you doing today?",
    voice_type: "monologue",
    format: "wav",
    sampling_rate: 22050
  })
});
```

## Response Format

### Success Response

```typescript
interface TTSResponse {
  audio: number[];               // Audio data as byte array
  duration?: number;             // Estimated duration in seconds
  format: string;                // Audio format used
  cached: boolean;               // Whether response was cached
  metadata?: {
    sampling_rate: number;       // Audio sampling rate
    text_length: number;         // Length of input text
    processing_time: number;     // Processing time in milliseconds
  };
}
```

### Error Response

```typescript
interface ErrorResponse {
  error: string;                 // Error message
  details?: string;              // Additional error details
  timestamp: string;             // ISO timestamp of error
}
```

## Status Codes

- **200 OK**: Successful voice generation
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Invalid or missing API key
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server processing error

## Features and Capabilities

### Multi-Speaker Dialogue

For dialogue generation, use speaker tags in your text:

```javascript
{
  text: "[S1] Hello there! How are you? [S2] I'm doing great, thanks for asking!",
  voice_type: "dialogue"
}
```

### Nonverbal Vocal Cues

Dia recognizes various expressive cues:

- `(laughs)` - Natural laughter
- `(sighs)` - Sighing sound
- `(clears throat)` - Throat clearing
- `(gasps)` - Surprised gasp
- `(coughs)` - Coughing sound
- `(singing)` or `(sings)` - Singing voice
- `(mumbles)` - Mumbled speech
- `(groans)` - Groaning sound
- `(whispers)` - Whispered speech
- `(screams)` - Screaming voice
- `(applause)` - Clapping sounds

### Text Optimization

The function automatically optimizes text for Dia:

- Ensures proper sentence endings
- Adds speaker tags for dialogue when missing
- Validates text length and content
- Removes invalid control characters

## Environment Configuration

### Supabase Environment Variables

Set in your Supabase project settings:

```bash
# Required: Segmind API key for Nari Labs Dia access
NARI_LABS_DIA_API_KEY=SG_your_segmind_api_key_here
```

### Local Development

For local development with Supabase CLI:

```bash
# In your .env.local file
NARI_LABS_DIA_API_KEY=SG_your_segmind_api_key_here
```

## Usage Examples

### Basic Monologue

```javascript
const response = await fetch('/functions/v1/nari-dia-tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Welcome to our travel planning assistant. I'm here to help you plan your perfect RV adventure!"
  })
});

const result = await response.json();
// result.audio contains the generated audio as a byte array
```

### Dialogue with Emotions

```javascript
const response = await fetch('/functions/v1/nari-dia-tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "[S1] Did you hear about the new RV park? (excited) [S2] No, tell me more! (curious)",
    voice_type: "dialogue",
    format: "mp3"
  })
});
```

### Expressive Monologue

```javascript
const response = await fetch('/functions/v1/nari-dia-tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Well, that was unexpected! (laughs) Let me think about this for a moment. (pause) Hmm, interesting.",
    enhance_audio: true,
    remove_silence: true
  })
});
```

## Performance Considerations

### Text Length Guidelines

- **Optimal**: 5-20 seconds of speech (roughly 50-200 characters)
- **Maximum**: 5000 characters
- **Recommended**: Break longer texts into chunks for better results

### Rate Limiting

- Segmind API has rate limits based on your subscription
- Monitor the `x-remaining-credits` header in responses
- Implement client-side rate limiting for production use

### Caching

The function includes metadata for implementing caching:

```javascript
// Check processing time and audio size for caching decisions
const { metadata } = response;
if (metadata.processing_time < 1000 && metadata.text_length < 100) {
  // Consider caching short, fast responses
}
```

## Error Handling

### Common Errors

1. **Authentication Errors (401)**
   ```javascript
   {
     "error": "Authentication failed. Please check your Segmind API key.",
     "timestamp": "2025-01-15T10:30:00.000Z"
   }
   ```

2. **Text Validation Errors (400)**
   ```javascript
   {
     "error": "Text length exceeds maximum limit of 5000 characters",
     "timestamp": "2025-01-15T10:30:00.000Z"
   }
   ```

3. **Rate Limit Errors (429)**
   ```javascript
   {
     "error": "Rate limit exceeded. Please try again later.",
     "timestamp": "2025-01-15T10:30:00.000Z"
   }
   ```

### Client-Side Error Handling

```javascript
try {
  const response = await fetch('/functions/v1/nari-dia-tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: "Hello world!" })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('TTS Error:', error.error);
    
    // Handle specific error types
    switch (response.status) {
      case 401:
        // Handle authentication error
        break;
      case 429:
        // Handle rate limiting
        break;
      case 400:
        // Handle validation error
        break;
      default:
        // Handle general error
    }
    return;
  }

  const result = await response.json();
  // Process successful response
  playAudio(result.audio, result.format);
  
} catch (error) {
  console.error('Network error:', error);
}
```

## Integration with PAM

This Edge Function is designed to integrate with the PAM (Personal Assistant Manager) system:

```javascript
// Example PAM integration
class PAMTTSService {
  async synthesize(text, options = {}) {
    const response = await fetch('/functions/v1/nari-dia-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice_type: options.dialogue ? 'dialogue' : 'monologue',
        format: options.format || 'wav',
        ...options
      })
    });

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.status}`);
    }

    return await response.json();
  }
}
```

## Monitoring and Logging

The function provides comprehensive logging:

- Request details and parameters
- Processing time tracking
- Audio size metrics
- Error details with stack traces
- Segmind credit usage tracking

### Response Headers

```
X-Processing-Time: 1234    // Processing time in milliseconds
X-Audio-Size: 56789        // Audio data size in bytes
```

## Security

- API keys are stored securely in Supabase environment variables
- Input validation prevents injection attacks
- CORS headers configured for secure cross-origin requests
- Error messages don't expose sensitive information

## Deployment

### Supabase CLI Deployment

```bash
# Deploy the function
supabase functions deploy nari-dia-tts

# Set environment variables
supabase secrets set NARI_LABS_DIA_API_KEY=SG_your_key_here
```

### Production Checklist

- [ ] Segmind API key configured
- [ ] Environment variables set
- [ ] Function deployed and tested
- [ ] Error monitoring configured
- [ ] Rate limiting implemented
- [ ] Caching strategy defined

## Troubleshooting

### Common Issues

1. **"Invalid credentials" Error**
   - Verify the `NARI_LABS_DIA_API_KEY` is set correctly
   - Ensure the API key starts with `SG_`
   - Check that the key is active in your Segmind account

2. **"Text is required" Error**
   - Ensure request body contains valid JSON
   - Check that `text` field is present and non-empty

3. **"Rate limit exceeded" Error**
   - Check your Segmind account credit balance
   - Implement request throttling in your application

4. **Large Response Times**
   - Use shorter text inputs (50-200 characters optimal)
   - Consider breaking long texts into chunks

### Debug Mode

Enable debug logging by checking the Supabase function logs:

```bash
supabase functions logs nari-dia-tts
```

## Support

For issues with:
- **Supabase Edge Function**: Check Supabase documentation
- **Nari Labs Dia Model**: Visit [GitHub repository](https://github.com/nari-labs/dia)
- **Segmind API**: Contact Segmind support
- **Integration Questions**: Refer to this documentation

## Version Information

- **Nari Labs Dia Model**: 1.6B parameters
- **Segmind API Version**: v1
- **Function Version**: 1.0.0
- **Last Updated**: January 2025