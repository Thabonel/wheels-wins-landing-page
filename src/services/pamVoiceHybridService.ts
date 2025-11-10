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

// =====================================================
// TYPES
// =====================================================

export interface VoiceSessionConfig {
  userId: string;
  apiBaseUrl: string;
  authToken: string;
  voice?: 'marin' | 'cedar' | 'alloy' | 'echo' | 'nova' | 'shimmer';
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
  private audioQueue: Float32Array[] = [];
  private isPlaying = false;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  async playAudioChunk(base64Audio: string): Promise<void> {
    try {
      // Decode base64 PCM16
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);

      // Convert to Float32 for Web Audio
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
      }

      this.audioQueue.push(float32);

      if (!this.isPlaying) {
        await this.playNextChunk();
      }
    } catch (error) {
      logger.error('[AudioProcessor] Failed to play chunk:', error);
    }
  }

  private async playNextChunk(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const float32 = this.audioQueue.shift()!;

    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.onended = () => this.playNextChunk();
    source.start();
  }

  stop(): void {
    this.audioQueue = [];
    this.isPlaying = false;
  }

  close(): void {
    this.stop();
    this.audioContext.close();
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
          sampleRate: 24000,
          channelCount: 1
        }
      });

      // Step 3: Initialize audio processing
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.audioProcessor = new AudioProcessor();

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
          voice: this.config.voice
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

      this.openaiWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${sessionData.session_token}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      } as any);

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

      this.claudeBridge = new WebSocket(
        `${wsUrl}/api/v1/pam/voice-hybrid/bridge/${this.config.userId}`
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

    this.processorNode.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);

      // Convert Float32 to PCM16
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
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
    this.processorNode.connect(this.audioContext.destination);

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
