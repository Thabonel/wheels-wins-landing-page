# PAM Voice Integration Guide - OpenAI Realtime API

**Date**: January 22, 2025
**Status**: Implementation in progress
**Model**: gpt-realtime (GPT-4o family, speech-to-speech)

## Overview

This document provides the complete integration guide for adding voice capabilities to PAM using OpenAI's Realtime API with the gpt-realtime model.

## What We've Built (Phase 1)

### Files Created:
1. **`src/services/pamVoiceService.ts`** - Voice service structure (placeholder for actual API)
2. **`src/components/pam/PAMWakeWord.tsx`** - Wake word detection component

### Features Implemented:
- ✅ Wake word detection ("Hey PAM") using browser's Web Speech API
- ✅ Microphone access and audio context setup
- ✅ PAM instruction set for voice interactions
- ✅ Tool execution framework (ready for 47 PAM tools)
- ✅ Basic UI components for voice activation

## What Needs to Be Done (Phase 2)

### 1. Install Official OpenAI Package

We already have `openai` package installed. Verify version supports Realtime API:

```bash
npm list openai
# Should be version 4.x or higher
```

If not latest:
```bash
npm install openai@latest
```

### 2. Actual OpenAI Realtime API Usage

Based on official SDK, here's the correct implementation:

```typescript
import { OpenAIRealtimeWebSocket } from 'openai/beta/realtime/websocket';

// Initialize Realtime WebSocket
const rt = new OpenAIRealtimeWebSocket({
  apiKey: process.env.VITE_OPENAI_API_KEY,
  model: 'gpt-4o-realtime-preview-2024-12-17', // Or 'gpt-realtime' if available
  dangerouslyAllowAPIKeyInBrowser: true // Required for browser usage
});

// Handle connection open
rt.socket.addEventListener('open', () => {
  console.log('Realtime connection opened');

  // Configure session
  rt.send({
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'], // Enable both
      model: 'gpt-4o-realtime-preview',
      voice: 'marin', // Or 'cedar', 'alloy', 'echo', etc
      instructions: 'You are PAM, the AI travel companion...',
      tools: [ /* PAM tool definitions */ ],
      turn_detection: {
        type: 'server_vad', // Server-side Voice Activity Detection
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 200
      }
    }
  });
});

// Handle audio input (user speaking)
rt.on('input_audio_buffer.speech_started', () => {
  console.log('User started speaking');
});

rt.on('input_audio_buffer.speech_stopped', () => {
  console.log('User stopped speaking');
});

// Handle AI response
rt.on('response.audio.delta', (event) => {
  // Play audio chunk
  playAudioDelta(event.delta);
});

rt.on('response.audio.done', () => {
  console.log('AI finished speaking');
});

// Handle function calls
rt.on('response.function_call_arguments.done', async (event) => {
  const { call_id, name, arguments: args } = event;

  // Execute PAM tool
  const result = await executePAMTool(name, JSON.parse(args));

  // Send result back to AI
  rt.send({
    type: 'conversation.item.create',
    item: {
      type: 'function_call_output',
      call_id: call_id,
      output: JSON.stringify(result)
    }
  });

  // Request AI to continue
  rt.send({ type: 'response.create' });
});

// Handle errors
rt.on('error', (error) => {
  console.error('Realtime error:', error);
});

// Send audio from microphone
async function streamMicrophoneAudio(rt: OpenAIRealtimeWebSocket) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext({ sampleRate: 24000 });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0);

    // Convert Float32Array to Int16Array (PCM16)
    const pcm16 = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Encode as base64 and send
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

    rt.send({
      type: 'input_audio_buffer.append',
      audio: base64
    });
  };

  source.connect(processor);
  processor.connect(audioContext.destination);
}
```

### 3. Update `pamVoiceService.ts` with Actual Implementation

Replace the placeholder code in lines 120-160 with the actual OpenAI Realtime API calls above.

**Key changes**:
- Import `OpenAIRealtimeWebSocket` from `'openai/beta/realtime/websocket'`
- Replace `this.client` with `OpenAIRealtimeWebSocket` instance
- Implement actual audio streaming (convert Float32 to PCM16, base64 encode)
- Implement actual event handlers using `.on()` methods
- Implement actual function call handling

### 4. Map All 47 PAM Tools

Currently `buildPAMTools()` only has 3 example tools. Need to add all 47:

**Budget Tools (10)**:
1. create_expense
2. analyze_budget
3. track_savings
4. update_budget
5. get_spending_summary
6. compare_vs_budget
7. predict_end_of_month
8. find_savings_opportunities
9. categorize_transaction
10. export_budget_report

**Trip Tools (12)**:
1. plan_trip
2. find_rv_parks
3. get_weather_forecast
4. calculate_gas_cost
5. find_cheap_gas
6. optimize_route
7. get_road_conditions
8. find_attractions
9. estimate_travel_time
10. save_favorite_spot
11. get_elevation
12. find_dump_stations

**Social Tools (10)**:
1. create_post
2. message_friend
3. comment_on_post
4. search_posts
5. get_feed
6. like_post
7. follow_user
8. share_location
9. find_nearby_rvers
10. create_event

**Shop Tools (5)**:
1. search_products
2. add_to_cart
3. get_cart
4. checkout
5. track_order

**Profile Tools (6)**:
1. update_profile
2. update_settings
3. manage_privacy
4. get_user_stats
5. export_data
6. update_vehicle_info

**Community Tools (2)**:
1. find_local_events
2. join_community

**Admin Tools (2)**:
1. get_system_status
2. manage_user_permissions

Each tool needs:
- `name`: Exact function name
- `description`: What the tool does (used by AI to decide when to call)
- `parameters`: JSON schema (type, properties, required fields)

**Source for tool schemas**: `backend/app/services/pam/core/pam.py` lines 60-500 (Claude format, convert to OpenAI format)

### 5. Audio Playback

Implement `playAudioDelta()` function to play base64-encoded PCM16 audio chunks:

```typescript
class AudioPlayer {
  private audioContext: AudioContext;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  async playDelta(base64Audio: string) {
    // Decode base64 to PCM16
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);

    // Convert PCM16 to Float32 for Web Audio API
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
    }

    // Create audio buffer
    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    // Play audio
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
  }
}
```

### 6. Tool Execution Backend Integration

The `executePAMTool()` function needs to call actual backend endpoints:

```typescript
private async executePAMTool(name: string, args: any): Promise<any> {
  const userId = await this.getUserId(); // Get current user ID
  const token = await this.getAuthToken(); // Get JWT token

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://pam-backend.onrender.com';

  const response = await fetch(`${baseUrl}/api/v1/pam/tools/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      user_id: userId,
      tool_name: name,
      parameters: args
    })
  });

  if (!response.ok) {
    throw new Error(`Tool execution failed: ${response.statusText}`);
  }

  return response.json();
}
```

**Backend endpoint needed**: `POST /api/v1/pam/tools/execute`
- Should route to existing tool implementations in `backend/app/services/pam/tools/`
- Already exists in PAM core, just need to expose as HTTP endpoint

### 7. Environment Variables

Add to `.env` and `.env.example`:

```bash
VITE_OPENAI_API_KEY=sk-...  # OpenAI API key
VITE_VOICE_ENABLED=true      # Feature flag for voice
```

### 8. UI Integration

Add wake word component to PAM chat interface:

```typescript
// In src/pages/PAM.tsx or wherever PAM chat is rendered
import { PAMWakeWord } from '@/components/pam/PAMWakeWord';

function PAMChat() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  return (
    <div>
      {/* Existing chat UI */}

      {/* Add wake word component */}
      <PAMWakeWord
        apiKey={apiKey}
        enabled={import.meta.env.VITE_VOICE_ENABLED === 'true'}
        onWakeWordDetected={() => {
          console.log('Wake word detected, voice session starting');
        }}
      />
    </div>
  );
}
```

## Testing Checklist

Once implementation is complete:

### Phase 1: Basic Voice
- [ ] "Hey PAM" wake word detected consistently (85%+ accuracy)
- [ ] Microphone access granted
- [ ] Audio streaming to OpenAI works
- [ ] AI responds with audio
- [ ] Audio playback is clear and natural

### Phase 2: Tool Calling
- [ ] "Hey PAM, add $50 gas expense" creates expense
- [ ] "Hey PAM, what's the weather in Denver?" uses weather tool
- [ ] "Hey PAM, find cheap gas near me" uses location + gas tool
- [ ] All 47 tools callable via voice

### Phase 3: User Experience
- [ ] Latency <500ms (voice input → audio response start)
- [ ] Natural interruptions work ("wait, PAM...")
- [ ] Handles background noise
- [ ] Works while driving (hands-free)
- [ ] Battery usage acceptable

### Phase 4: Edge Cases
- [ ] Handles no microphone permission
- [ ] Handles network disconnection
- [ ] Handles API rate limits
- [ ] Handles tool execution failures gracefully
- [ ] Provides helpful error messages

## Cost Estimates

**GPT-realtime pricing**:
- $32 per 1M audio input tokens (~$0.06/min)
- $64 per 1M audio output tokens (~$0.24/min)
- **Total**: ~$0.30 per minute of conversation

**Typical usage**:
- 2-minute conversation: $0.60
- 100 conversations/month: $60
- 1000 conversations/month: $600

**Cost optimization strategies**:
- Use shorter system instructions (fewer tokens)
- Implement conversation timeouts (auto-stop after 30s silence)
- Cache frequently called tools
- Use text mode for non-urgent queries

## Fallback Plan

If GPT-realtime has issues:
1. Fall back to gpt-4o-realtime-preview (older model, still works)
2. Fall back to custom pipeline (Whisper + Claude + TTS) if necessary
3. Fall back to text-only chat if all voice fails

Keep existing Claude-based text chat working independently.

## References

- Official SDK: https://github.com/openai/openai-node
- Realtime docs: https://platform.openai.com/docs/guides/realtime
- Example console: https://github.com/openai/openai-realtime-console
- Community examples: https://github.com/transitive-bullshit/openai-realtime-api

## Next Steps

1. ✅ Research complete - documented API usage
2. ⬜ Implement actual OpenAI Realtime WebSocket in `pamVoiceService.ts`
3. ⬜ Add all 47 PAM tools to `buildPAMTools()`
4. ⬜ Implement audio streaming (mic → base64 → API)
5. ⬜ Implement audio playback (API → base64 → speakers)
6. ⬜ Add backend endpoint for tool execution
7. ⬜ Integrate wake word component into PAM UI
8. ⬜ Test end-to-end voice flow
9. ⬜ Deploy to staging
10. ⬜ Gather user feedback
