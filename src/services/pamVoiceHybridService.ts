/**
 * PAM Hybrid Voice Service
 *
 * Architecture: OpenAI Realtime (voice I/O) + Claude Sonnet 4.5 (reasoning)
 *
 * Flow:
 * 1. User speaks → OpenAI Realtime transcribes
 * 2. Text → Backend WebSocket → Claude (reasoning + tools)
 * 3. Claude response text → OpenAI Realtime speaks
 *
 * Best of both worlds:
 * - Natural voice with low latency (OpenAI)
 * - Superior reasoning and tools (Claude)
 */

import { logger } from '@/lib/logger';

// Simple linear resampler from inRate → outRate for mono Float32
function resampleFloat32(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (inRate === outRate || input.length === 0) return input;
  const ratio = outRate / inRate;
  const outLength = Math.max(1, Math.floor(input.length * ratio));
  const output = new Float32Array(outLength);
  const step = inRate / outRate;
  let pos = 0;
  for (let i = 0; i < outLength; i++) {
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = input[idx] ?? 0;
    const b = input[idx + 1] ?? a;
    output[i] = a + (b - a) * frac;
    pos += step;
  }
  return output;
}

// =====================================================
// TYPES
// =====================================================

export interface VoiceSessionConfig {
  userId: string;
  apiBaseUrl: string;
  authToken: string;
  voice?: 'marin' | 'cedar' | 'alloy' | 'echo' | 'nova' | 'shimmer';
  temperature?: number;
  language?: string; // User's preferred language (e.g., 'en', 'es', 'fr')
  location?: {
    lat: number;
    lng: number;
    city?: string;
    region?: string;
  };
  currentPage?: string;
  onTranscript?: (text: string) => void;
  onResponse?: (text: string) => void;
  onStatusChange?: (status: VoiceStatus) => void;
}

export interface VoiceStatus {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  latency?: number;
}

interface OpenAISessionData {
  session_token: string;
  expires_at: string;
  ws_url: string;
  model: string;
  voice: string;
}

// =====================================================
// AUDIO PROCESSOR
// =====================================================

class AudioProcessor {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private scheduleTime = 0; // keeps continuous timeline
  private readonly prerollSec = 0.2; // jitter buffer
  private readonly crossfadeSec = 0.01; // 10 ms fade at boundaries

  // Playback completion tracking
  private onPlaybackComplete: (() => void) | null = null;
  private playbackEndTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastScheduledEndTime = 0; // Track when audio will finish

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Set callback for when audio playback actually completes
   */
  setOnPlaybackComplete(callback: (() => void) | null): void {
    this.onPlaybackComplete = callback;
  }

  async playAudioChunk(base64Audio: string): Promise<void> {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);

      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
      }

      // Create buffer at 24 kHz (Realtime PCM16 default)
      const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Schedule playback with small crossfade to avoid clicks
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const gain = this.audioContext.createGain();
      gain.gain.setValueAtTime(0, this.audioContext.currentTime);
      source.connect(gain).connect(this.masterGain);

      // Compute start time with preroll/jitter handling
      const now = this.audioContext.currentTime;
      if (this.scheduleTime < now + this.prerollSec) {
        this.scheduleTime = now + this.prerollSec;
      }

      const startTime = this.scheduleTime;
      const duration = audioBuffer.duration;
      const endTime = startTime + duration;

      // Fade in/out envelopes to remove boundary clicks
      const fade = Math.min(this.crossfadeSec, duration / 4);
      gain.gain.setValueAtTime(0.0, startTime);
      gain.gain.linearRampToValueAtTime(1.0, startTime + fade);
      gain.gain.setValueAtTime(1.0, endTime - fade);
      gain.gain.linearRampToValueAtTime(0.0, endTime);

      source.start(startTime);

      // Next chunk starts with tiny overlap equal to fade
      this.scheduleTime = endTime - fade;

      // Track when this chunk will finish for completion callback
      this.lastScheduledEndTime = Math.max(this.lastScheduledEndTime, endTime);
    } catch (error) {
      logger.error('[AudioProcessor] Failed to play chunk:', error);
    }
  }

  /**
   * Schedule completion callback after all audio finishes playing
   * Called when response.audio.done indicates no more chunks coming
   */
  schedulePlaybackComplete(): void {
    // Clear any existing timeout
    if (this.playbackEndTimeout) {
      clearTimeout(this.playbackEndTimeout);
      this.playbackEndTimeout = null;
    }

    if (!this.onPlaybackComplete) return;

    const now = this.audioContext.currentTime;
    const timeUntilEnd = (this.lastScheduledEndTime - now) * 1000; // Convert to ms

    if (timeUntilEnd > 0) {
      // Audio still playing - wait for it to finish
      logger.info(`[AudioProcessor] Audio finishes in ${timeUntilEnd.toFixed(0)}ms, scheduling completion callback`);
      this.playbackEndTimeout = setTimeout(() => {
        logger.info('[AudioProcessor] Audio playback actually complete');
        this.onPlaybackComplete?.();
        this.playbackEndTimeout = null;
      }, timeUntilEnd + 100); // +100ms buffer for safety
    } else {
      // Audio already finished or no audio was scheduled
      logger.info('[AudioProcessor] No pending audio, calling completion immediately');
      this.onPlaybackComplete();
    }
  }

  stop(): void {
    // Smooth fade-out master gain to prevent pop
    const now = this.audioContext.currentTime;
    this.masterGain.gain.setTargetAtTime(0.0, now, 0.01);
    // Reset schedule so next playback re-prerolls
    this.scheduleTime = 0;
    this.lastScheduledEndTime = 0;

    // Clear any pending playback completion timeout
    if (this.playbackEndTimeout) {
      clearTimeout(this.playbackEndTimeout);
      this.playbackEndTimeout = null;
    }
  }
}

// =====================================================
// HYBRID VOICE SERVICE
// =====================================================

export class PAMVoiceHybridService {
  private config: VoiceSessionConfig;
  private openaiWs: WebSocket | null = null;
  private claudeBridge: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioProcessor: AudioProcessor | null = null;
  private processorNode: ScriptProcessorNode | null = null;

  private status: VoiceStatus = {
    isConnected: false,
    isListening: false,
    isSpeaking: false
  };

  // Track when we're waiting for audio playback to actually complete
  private audioCompletionPending = false;

  constructor(config: VoiceSessionConfig) {
    this.config = {
      voice: 'marin', // Natural expressive voice
      ...config
    };
  }

  // =====================================================
  // START SESSION
  // =====================================================

  async start(): Promise<void> {
    try {
      logger.info('[PAMVoiceHybrid] Starting hybrid voice session...');

      // Step 1: Create OpenAI Realtime session (voice I/O only)
      const sessionData = await this.createOpenAISession();

      // Step 2: Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Capture at device/native 48k when possible; we resample to 24k for OpenAI
          sampleRate: 48000,
          channelCount: 1
        }
      });

      // Step 3: Initialize audio processing
      // Let browser use native sample rate for microphone processing too
      this.audioContext = new AudioContext();
      this.audioProcessor = new AudioProcessor(this.audioContext);

      // Set up playback completion callback - called when audio actually finishes
      this.audioProcessor.setOnPlaybackComplete(() => {
        if (this.audioCompletionPending) {
          this.audioCompletionPending = false;
          logger.info('[PAMVoiceHybrid] ✅ Audio playback actually complete - setting isSpeaking=false');
          this.updateStatus({ isSpeaking: false });
        }
      });

      // Step 4: Connect to OpenAI Realtime WebSocket
      await this.connectOpenAIWebSocket(sessionData);

      // Step 5: Connect to Claude bridge WebSocket
      await this.connectClaudeBridge();

      // Step 6: Start streaming microphone to OpenAI
      this.startMicrophoneStreaming();

      // isListening starts false - it means "user currently speaking"
      // It will be set true when user starts speaking (input_audio_buffer.speech_started)
      this.updateStatus({ isConnected: true, isListening: false });

      logger.info('[PAMVoiceHybrid] ✅ Hybrid voice session started');

    } catch (error) {
      logger.error('[PAMVoiceHybrid] Failed to start:', error);
      this.cleanup();
      throw error;
    }
  }

  // =====================================================
  // OPENAI SESSION CREATION
  // =====================================================

  private async createOpenAISession(): Promise<OpenAISessionData> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/api/v1/pam/voice-hybrid/create-session`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          voice: this.config.voice,
          temperature: this.config.temperature ?? 0.65
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create session: ${error}`);
    }

    const data = await response.json();
    logger.info('[PAMVoiceHybrid] OpenAI session created:', {
      voice: data.voice,
      expires_at: data.expires_at
    });

    return data;
  }

  // =====================================================
  // OPENAI WEBSOCKET (Voice I/O)
  // =====================================================

  private async connectOpenAIWebSocket(sessionData: OpenAISessionData): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${sessionData.ws_url}?model=${sessionData.model}`;

      // CRITICAL: Browser WebSocket auth requires subprotocols, NOT headers
      // Research: https://platform.openai.com/docs/guides/realtime
      this.openaiWs = new WebSocket(wsUrl, [
        'realtime',
        `openai-insecure-api-key.${sessionData.session_token}`,
        'openai-beta.realtime-v1'
      ]);

      this.openaiWs.onopen = () => {
        logger.info('[PAMVoiceHybrid] OpenAI WebSocket connected');

        // Configure session
        this.sendToOpenAI({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: sessionData.voice,
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16'
          }
        });

        resolve();
      };

      this.openaiWs.onmessage = (event) => {
        this.handleOpenAIMessage(JSON.parse(event.data));
      };

      this.openaiWs.onerror = (error) => {
        logger.error('[PAMVoiceHybrid] OpenAI WebSocket error:', error);
        reject(error);
      };

      this.openaiWs.onclose = () => {
        logger.info('[PAMVoiceHybrid] OpenAI WebSocket closed');
        this.updateStatus({ isConnected: false });
      };
    });
  }

  private handleOpenAIMessage(message: any): void {
    switch (message.type) {
      case 'session.created':
        logger.info('[PAMVoiceHybrid] ✅ OpenAI session created (waiting for session.updated)');
        // Don't greet yet - wait for session.updated after our config is applied
        break;

      case 'session.updated':
        logger.info('[PAMVoiceHybrid] ✅ OpenAI session configured - triggering greeting');
        // Small delay to ensure OpenAI is fully ready for TTS
        setTimeout(() => {
          this.speakGreeting();
        }, 200);
        break;

      case 'conversation.item.created':
        // User spoke, OpenAI transcribed
        if (message.item?.type === 'message' && message.item?.role === 'user') {
          const transcript = message.item.content?.[0]?.transcript || '';
          if (transcript) {
            logger.info('[PAMVoiceHybrid] 👤 Transcript:', transcript);
            this.config.onTranscript?.(transcript);

            // WORKAROUND: Route through text REST endpoint which has full profile/tools access
            // The WebSocket bridge doesn't load context properly, but text mode does
            this.sendViaTextEndpoint(transcript);
          }
        }
        break;

      case 'response.audio.delta':
        // OpenAI speaking response (greeting or Claude response)
        if (message.delta && this.audioProcessor) {
          logger.debug('[PAMVoiceHybrid] 🔊 Received audio chunk');
          this.audioProcessor.playAudioChunk(message.delta);
          this.updateStatus({ isSpeaking: true });
        }
        break;

      case 'response.audio.done':
        // Audio chunks received, but may still be playing in AudioProcessor queue
        // Schedule completion callback for when audio actually finishes
        logger.info('[PAMVoiceHybrid] 📦 Audio chunks received, waiting for playback to complete');
        this.audioCompletionPending = true;
        this.audioProcessor?.schedulePlaybackComplete();
        // isSpeaking will be set to false by the playback completion callback
        break;

      case 'input_audio_buffer.speech_started':
        logger.info('[PAMVoiceHybrid] 🎤 User started speaking');
        this.updateStatus({ isListening: true });
        break;

      case 'input_audio_buffer.speech_stopped':
        logger.info('[PAMVoiceHybrid] 🎤 User stopped speaking');
        // CRITICAL: Set isListening to false so silence detection works
        this.updateStatus({ isListening: false });
        break;

      case 'error':
        logger.error('[PAMVoiceHybrid] OpenAI error:', message.error);
        break;
    }
  }

  // =====================================================
  // CLAUDE BRIDGE WEBSOCKET
  // =====================================================

  private async connectClaudeBridge(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.apiBaseUrl
        .replace('https://', 'wss://')
        .replace('http://', 'ws://');

      // CRITICAL: Add JWT token as query parameter for authentication
      this.claudeBridge = new WebSocket(
        `${wsUrl}/api/v1/pam/voice-hybrid/bridge/${this.config.userId}?token=${this.config.authToken}`
      );

      this.claudeBridge.onopen = () => {
        logger.info('[PAMVoiceHybrid] Claude bridge connected');
        resolve();
      };

      this.claudeBridge.onmessage = (event) => {
        this.handleClaudeMessage(JSON.parse(event.data));
      };

      this.claudeBridge.onerror = (error) => {
        logger.error('[PAMVoiceHybrid] Claude bridge error:', error);
        reject(error);
      };

      this.claudeBridge.onclose = () => {
        logger.info('[PAMVoiceHybrid] Claude bridge closed');
      };
    });
  }

  private handleClaudeMessage(message: any): void {
    if (message.type === 'assistant_response') {
      const responseText = message.text;
      logger.info('[PAMVoiceHybrid] 🤖 Claude response:', responseText);
      this.config.onResponse?.(responseText);

      // Handle UI actions from tool execution (e.g., calendar updates)
      if (message.ui_actions && Array.isArray(message.ui_actions)) {
        message.ui_actions.forEach((action: any) => {
          logger.info(`[PAMVoiceHybrid] UI Action: ${action.type}`, action);

          switch (action.type) {
            case 'reload_calendar':
              // Dispatch event for calendar component to reload
              window.dispatchEvent(new CustomEvent('reload-calendar', {
                detail: {
                  entity_id: action.entity_id,
                  entity_type: action.entity_type,
                  entity_title: action.entity_title
                }
              }));
              logger.info('[PAMVoiceHybrid] Dispatched calendar reload event');
              break;

            case 'reload_expenses':
              // Dispatch event for expenses component to reload
              window.dispatchEvent(new CustomEvent('reload-expenses', {
                detail: {
                  entity_id: action.entity_id
                }
              }));
              break;

            case 'navigate':
              // Handle navigation if needed
              logger.info(`[PAMVoiceHybrid] Navigation requested: ${action.path}`);
              break;

            default:
              logger.warn(`[PAMVoiceHybrid] Unknown UI action type: ${action.type}`);
          }
        });
      }

      // Send to OpenAI Realtime for TTS
      this.sendToOpenAI({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'input_text',
              text: responseText
            }
          ]
        }
      });

      // Trigger response generation (TTS)
      this.sendToOpenAI({
        type: 'response.create',
        response: {
          modalities: ['audio']
        }
      });
    }
  }

  // =====================================================
  // TEXT ENDPOINT WORKAROUND
  // =====================================================

  /**
   * Route voice input through text REST endpoint for full profile/tools access.
   * WORKAROUND: The WebSocket bridge doesn't load context properly, but text mode does.
   * This sends the transcript to /api/v1/pam/chat and speaks the response.
   */
  private async sendViaTextEndpoint(transcript: string): Promise<void> {
    try {
      logger.info('[PAMVoiceHybrid] 📝 Routing through text endpoint for full context access');

      const response = await fetch(
        `${this.config.apiBaseUrl}/api/v1/pam/chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: transcript,
            context: {
              user_id: this.config.userId,
              language: this.config.language || 'en',
              user_location: this.config.location,
              current_page: this.config.currentPage || 'pam_chat',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              is_voice: true
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Text endpoint failed: ${response.status}`);
      }

      const result = await response.json();
      const responseText = result.text || result.response || '';

      logger.info('[PAMVoiceHybrid] 🤖 Got response from text endpoint:', responseText.substring(0, 50));
      this.config.onResponse?.(responseText);

      // Handle UI actions from tool execution (same as WebSocket path)
      if (result.ui_actions && Array.isArray(result.ui_actions)) {
        result.ui_actions.forEach((action: any) => {
          logger.info(`[PAMVoiceHybrid] UI Action: ${action.type}`, action);
          if (action.type === 'reload_calendar') {
            window.dispatchEvent(new CustomEvent('reload-calendar', { detail: action }));
          } else if (action.type === 'reload_expenses') {
            window.dispatchEvent(new CustomEvent('reload-expenses', { detail: action }));
          }
        });
      }

      // Send response to OpenAI for TTS
      this.sendToOpenAI({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'assistant',
          content: [{
            type: 'input_text',
            text: responseText
          }]
        }
      });

      // Trigger TTS
      this.sendToOpenAI({
        type: 'response.create',
        response: {
          modalities: ['audio']
        }
      });

    } catch (error) {
      logger.error('[PAMVoiceHybrid] Text endpoint error:', error);
      // Speak error message
      this.sendToOpenAI({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: 'Say: "Sorry, I had trouble processing that. Please try again."'
        }
      });
    }
  }

  // =====================================================
  // GREETING
  // =====================================================

  /**
   * Speak a greeting when PAM is activated via wake word
   * Uses response.create with instructions to generate audio greeting
   */
  private speakGreeting(): void {
    logger.info('[PAMVoiceHybrid] 🎤 Speaking greeting "Hi! How can I help you?"');

    // Use response.create with instructions to generate spoken greeting
    // This tells OpenAI to generate both text and audio for the greeting
    const responseMsg = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        instructions: 'Say exactly this greeting to the user: "Hi! How can I help you?" - nothing more, nothing less.'
      }
    };
    logger.debug('[PAMVoiceHybrid] Sending response.create with greeting:', JSON.stringify(responseMsg));
    this.sendToOpenAI(responseMsg);

    logger.info('[PAMVoiceHybrid] ✅ Greeting request sent to OpenAI');
  }

  // =====================================================
  // MICROPHONE STREAMING
  // =====================================================

  private startMicrophoneStreaming(): void {
    if (!this.mediaStream || !this.audioContext) {
      throw new Error('Media not initialized');
    }

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    // Use a muted gain to keep the processing node active without audible loopback
    const silentGain = this.audioContext.createGain();
    silentGain.gain.setValueAtTime(0.0, this.audioContext.currentTime);

    this.processorNode.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);

      // Resample mic audio from AudioContext rate → 24k mono Float32
      const inRate = this.audioContext!.sampleRate;
      const targetRate = 24000;
      const resampled = resampleFloat32(inputData, inRate, targetRate);

      // Convert Float32 to PCM16 at 24k
      const pcm16 = new Int16Array(resampled.length);
      for (let i = 0; i < resampled.length; i++) {
        const s = Math.max(-1, Math.min(1, resampled[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Encode as base64 and send to OpenAI
      const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

      this.sendToOpenAI({
        type: 'input_audio_buffer.append',
        audio: base64
      });
    };

    source.connect(this.processorNode);
    // Connect to silent gain instead of destination to avoid feedback/clicks
    this.processorNode.connect(silentGain).connect(this.audioContext.destination);

    logger.info('[PAMVoiceHybrid] 🎤 Microphone streaming started');
  }

  // =====================================================
  // WEBSOCKET HELPERS
  // =====================================================

  private sendToOpenAI(message: any): void {
    if (this.openaiWs?.readyState === WebSocket.OPEN) {
      this.openaiWs.send(JSON.stringify(message));
    }
  }

  private sendToClaudeBridge(message: any): void {
    if (this.claudeBridge?.readyState === WebSocket.OPEN) {
      this.claudeBridge.send(JSON.stringify(message));
    }
  }

  // =====================================================
  // INTERRUPTION
  // =====================================================

  interrupt(): void {
    // Stop PAM mid-sentence (crucial for driving safety)
    logger.info('[PAMVoiceHybrid] ⚠️ Interrupting...');

    this.sendToOpenAI({
      type: 'response.cancel'
    });

    this.audioProcessor?.stop();
    this.updateStatus({ isSpeaking: false });
  }

  // =====================================================
  // STATUS & CLEANUP
  // =====================================================

  private updateStatus(updates: Partial<VoiceStatus>): void {
    this.status = { ...this.status, ...updates };
    this.config.onStatusChange?.(this.status);
  }

  getStatus(): VoiceStatus {
    return { ...this.status };
  }

  async stop(): Promise<void> {
    logger.info('[PAMVoiceHybrid] Stopping voice session...');
    this.cleanup();
    logger.info('[PAMVoiceHybrid] Voice session stopped');
    // Broadcast global stop so any UI mic toggles can sync visual state
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pam-voice:stop-all'));
    }
  }

  private cleanup(): void {
    // Stop audio processor
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    // Stop audio processor
    if (this.audioProcessor) {
      this.audioProcessor.stop();
      this.audioProcessor = null;
    }

    // Stop microphone
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Close WebSockets
    if (this.openaiWs) {
      this.openaiWs.close();
      this.openaiWs = null;
    }

    if (this.claudeBridge) {
      this.claudeBridge.close();
      this.claudeBridge = null;
    }

    this.updateStatus({
      isConnected: false,
      isListening: false,
      isSpeaking: false
    });
  }
}

// =====================================================
// SINGLETON MANAGER
// =====================================================

let voiceServiceInstance: PAMVoiceHybridService | null = null;

export function createVoiceService(config: VoiceSessionConfig): PAMVoiceHybridService {
  if (voiceServiceInstance) {
    voiceServiceInstance.stop();
  }
  voiceServiceInstance = new PAMVoiceHybridService(config);
  return voiceServiceInstance;
}

export function getVoiceService(): PAMVoiceHybridService | null {
  return voiceServiceInstance;
}

export function destroyVoiceService(): void {
  if (voiceServiceInstance) {
    voiceServiceInstance.stop();
    voiceServiceInstance = null;
  }
}
