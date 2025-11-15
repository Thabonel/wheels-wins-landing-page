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

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);
    this.masterGain.connect(this.audioContext.destination);
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
    } catch (error) {
      logger.error('[AudioProcessor] Failed to play chunk:', error);
    }
  }

  stop(): void {
    // Smooth fade-out master gain to prevent pop
    const now = this.audioContext.currentTime;
    this.masterGain.gain.setTargetAtTime(0.0, now, 0.01);
    // Reset schedule so next playback re-prerolls
    this.scheduleTime = 0;
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

      // Step 4: Connect to OpenAI Realtime WebSocket
      await this.connectOpenAIWebSocket(sessionData);

      // Step 5: Connect to Claude bridge WebSocket
      await this.connectClaudeBridge();

      // Step 6: Start streaming microphone to OpenAI
      this.startMicrophoneStreaming();

      this.updateStatus({ isConnected: true, isListening: true });

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
        logger.info('[PAMVoiceHybrid] OpenAI session ready');
        break;

      case 'conversation.item.created':
        // User spoke, OpenAI transcribed
        if (message.item?.type === 'message' && message.item?.role === 'user') {
          const transcript = message.item.content?.[0]?.transcript || '';
          if (transcript) {
            logger.info('[PAMVoiceHybrid] 👤 Transcript:', transcript);
            this.config.onTranscript?.(transcript);

            // Send to Claude for reasoning
            this.sendToClaudeBridge({
              type: 'user_message',
              text: transcript,
              timestamp: Date.now()
            });
          }
        }
        break;

      case 'response.audio.delta':
        // OpenAI speaking response from Claude
        if (message.delta && this.audioProcessor) {
          this.audioProcessor.playAudioChunk(message.delta);
          this.updateStatus({ isSpeaking: true });
        }
        break;

      case 'response.audio.done':
        logger.info('[PAMVoiceHybrid] 🔊 Speech complete');
        this.updateStatus({ isSpeaking: false });
        break;

      case 'input_audio_buffer.speech_started':
        logger.info('[PAMVoiceHybrid] 🎤 User started speaking');
        this.updateStatus({ isListening: true });
        break;

      case 'input_audio_buffer.speech_stopped':
        logger.info('[PAMVoiceHybrid] 🎤 User stopped speaking');
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
  }

  private cleanup(): void {
    // Stop audio processor
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    // Close audio
    if (this.audioProcessor) {
      this.audioProcessor.close();
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
