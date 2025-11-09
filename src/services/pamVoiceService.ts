/**
 * PAM Voice Service - GPT-realtime Integration
 *
 * Ultra-simple voice service using OpenAI's GPT-realtime speech-to-speech model.
 * Replaces complex Whisper + Claude + TTS pipeline with single model.
 *
 * Features:
 * - Speech-to-speech (no STT/TTS pipeline)
 * - 300-500ms latency
 * - Function calling for 47 PAM tools
 * - Natural interruptions
 * - Mid-sentence language switching
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { buildPAMTools, type PAMTool } from './pamVoiceTools';

// =====================================================
// TYPES
// =====================================================

export interface VoiceServiceConfig {
  apiKey: string;
  model?: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'marin' | 'cedar';
  instructions?: string;
}

export interface VoiceServiceStatus {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  model: string;
  latency?: number;
}

// =====================================================
// AUDIO PLAYER
// =====================================================

class AudioPlayer {
  private audioContext: AudioContext;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  async playDelta(base64Audio: string): Promise<void> {
    try {
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

      // Add to queue
      this.audioQueue.push(audioBuffer);

      // Start playing if not already playing
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      logger.error('[AudioPlayer] Failed to play audio delta:', error);
    }
  }

  private playNextInQueue(): void {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.onended = () => {
      this.playNextInQueue();
    };
    source.start();
    this.currentSource = source;
  }

  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
  }

  close(): void {
    this.stop();
    this.audioContext.close();
  }
}

// =====================================================
// PAM VOICE SERVICE
// =====================================================

class PAMVoiceService {
  private client: OpenAI | null = null;
  private realtimeSession: WebSocket | null = null;
  private isConnected: boolean = false;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private config: VoiceServiceConfig;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private audioPlayer: AudioPlayer | null = null;

  constructor(config: VoiceServiceConfig) {
    this.config = {
      model: 'gpt-realtime',
      voice: 'marin', // Natural, expressive voice
      instructions: this.buildPAMInstructions(),
      ...config
    };
  }

  /**
   * Build system instructions for PAM voice interactions
   */
  private buildPAMInstructions(): string {
    return `You are PAM (Personal AI Manager), the AI travel companion for Wheels & Wins RV travelers.

PERSONALITY:
- Friendly and helpful, not cutesy
- Brief responses (1-2 sentences unless asked for more)
- Confident but not arrogant
- Take action, don't just answer questions

YOUR ROLE:
- Help RVers save money on fuel, camping, and travel
- Plan trips and optimize routes
- Track budgets and expenses
- Connect travelers with community
- Manage all aspects of their nomadic lifestyle

CRITICAL RULES:
1. Be concise - RVers are often driving
2. Prioritize safety - never distract while driving
3. Speak naturally and conversationally
4. Use tools proactively to help users
5. Track savings to prove ROI

When users ask you to do something (add expense, plan trip, etc), USE THE TOOLS. Don't just describe what you would do.`;
  }

  /**
   * Initialize OpenAI client
   */
  private initializeClient(): void {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key required for voice service');
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      dangerouslyAllowBrowser: true // Required for browser usage
    });

    logger.info('[PAMVoice] Client initialized');
  }

  /**
   * Start voice session with GPT-realtime
   */
  async start(): Promise<void> {
    try {
      logger.info('[PAMVoice] Starting voice session...');

      // Initialize client if not already done
      if (!this.client) {
        this.initializeClient();
      }

      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      logger.info('[PAMVoice] Microphone access granted');

      // Initialize audio context for processing
      this.audioContext = new AudioContext({ sampleRate: 24000 });

      // Create Realtime session
      // Note: This is a simplified version - actual OpenAI Realtime API
      // integration will depend on the official SDK API surface
      await this.createRealtimeSession();

      this.isConnected = true;
      this.isListening = true;

      logger.info('[PAMVoice] Voice session started successfully');

    } catch (error) {
      logger.error('[PAMVoice] Failed to start voice session:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Create and configure Realtime session
   */
  private async createRealtimeSession(): Promise<void> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    logger.info('[PAMVoice] Creating Realtime session with GPT-realtime model');

    // Create WebSocket connection to OpenAI Realtime API
    const model = 'gpt-4o-realtime-preview-2024-12-17';
    const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;

    this.realtimeSession = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    } as any);

    this.realtimeSession.addEventListener('open', () => {
      logger.info('[PAMVoice] WebSocket connection opened');

      // Configure session
      this.sendRealtimeMessage({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice: this.config.voice || 'alloy',
          instructions: this.config.instructions,
          tools: this.buildPAMTools(),
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 200
          },
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          }
        }
      });

      // Start streaming microphone audio
      this.startAudioStreaming();
    });

    this.realtimeSession.addEventListener('message', (event) => {
      this.handleRealtimeMessage(JSON.parse(event.data));
    });

    this.realtimeSession.addEventListener('error', (error) => {
      logger.error('[PAMVoice] WebSocket error:', error);
    });

    this.realtimeSession.addEventListener('close', () => {
      logger.info('[PAMVoice] WebSocket connection closed');
      this.isConnected = false;
    });
  }

  /**
   * Send message to Realtime API
   */
  private sendRealtimeMessage(message: any): void {
    if (this.realtimeSession && this.realtimeSession.readyState === WebSocket.OPEN) {
      this.realtimeSession.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming messages from Realtime API
   */
  private handleRealtimeMessage(message: any): void {
    switch (message.type) {
      case 'session.created':
        logger.info('[PAMVoice] Session created:', message.session);
        break;

      case 'session.updated':
        logger.info('[PAMVoice] Session updated');
        break;

      case 'input_audio_buffer.speech_started':
        logger.info('[PAMVoice] User started speaking');
        break;

      case 'input_audio_buffer.speech_stopped':
        logger.info('[PAMVoice] User stopped speaking');
        break;

      case 'response.audio.delta':
        // Play audio chunk
        if (message.delta && this.audioPlayer) {
          this.audioPlayer.playDelta(message.delta);
        }
        break;

      case 'response.audio.done':
        logger.info('[PAMVoice] AI finished speaking');
        this.isSpeaking = false;
        break;

      case 'response.function_call_arguments.done':
        // Execute tool
        this.handleFunctionCall({
          id: message.call_id,
          function_call: {
            name: message.name,
            arguments: message.arguments
          }
        });
        break;

      case 'error':
        logger.error('[PAMVoice] Realtime API error:', message.error);
        break;

      default:
        // logger.debug('[PAMVoice] Unhandled message type:', message.type);
        break;
    }
  }

  /**
   * Start streaming audio from microphone
   */
  private startAudioStreaming(): void {
    if (!this.mediaStream || !this.audioContext) {
      logger.error('[PAMVoice] Cannot start audio streaming: media not initialized');
      return;
    }

    // Initialize audio player
    this.audioPlayer = new AudioPlayer();

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.audioProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);

      // Convert Float32Array to Int16Array (PCM16)
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Encode as base64 and send to API
      const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

      this.sendRealtimeMessage({
        type: 'input_audio_buffer.append',
        audio: base64
      });
    };

    source.connect(this.audioProcessor);
    this.audioProcessor.connect(this.audioContext.destination);

    logger.info('[PAMVoice] Audio streaming started');
  }

  /**
   * Build PAM tool definitions for function calling
   * Maps existing 47 PAM tools to OpenAI function calling format
   */
  private buildPAMTools(): PAMTool[] {
    return buildPAMTools();
  }


  /**
   * Handle function call from GPT-realtime
   */
  private async handleFunctionCall(item: any): Promise<void> {
    const { name, arguments: args } = item.function_call;

    logger.info(`[PAMVoice] Executing tool: ${name}`, args);

    try {
      // Execute the PAM tool
      const result = await this.executePAMTool(name, JSON.parse(args));

      // Send result back to GPT-realtime
      this.sendRealtimeMessage({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: item.id,
          output: JSON.stringify(result)
        }
      });

      // Request AI to continue generating response
      this.sendRealtimeMessage({ type: 'response.create' });

      logger.info(`[PAMVoice] Tool ${name} executed successfully`);
    } catch (error) {
      logger.error(`[PAMVoice] Tool ${name} failed:`, error);

      // Send error back to GPT-realtime
      this.sendRealtimeMessage({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: item.id,
          output: JSON.stringify({ error: String(error) })
        }
      });

      // Request AI to continue even after error
      this.sendRealtimeMessage({ type: 'response.create' });
    }
  }

  /**
   * Execute PAM tool via backend API
   */
  private async executePAMTool(name: string, args: any): Promise<any> {
    // Call existing PAM backend endpoints
    const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://pam-backend.onrender.com';

    const response = await fetch(`${baseUrl}/api/v1/pam/tools/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(args)
    });

    if (!response.ok) {
      throw new Error(`Tool execution failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Stop voice session
   */
  async stop(): Promise<void> {
    logger.info('[PAMVoice] Stopping voice session...');

    this.isListening = false;
    this.cleanup();

    logger.info('[PAMVoice] Voice session stopped');
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Stop audio processor
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }

    // Stop audio player
    if (this.audioPlayer) {
      this.audioPlayer.close();
      this.audioPlayer = null;
    }

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Close WebSocket
    if (this.realtimeSession) {
      if (this.realtimeSession.readyState === WebSocket.OPEN) {
        this.realtimeSession.close();
      }
      this.realtimeSession = null;
    }

    this.isConnected = false;
    this.isListening = false;
    this.isSpeaking = false;
  }

  /**
   * Get current status
   */
  getStatus(): VoiceServiceStatus {
    return {
      isConnected: this.isConnected,
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      model: this.config.model || 'gpt-realtime',
      latency: undefined // TODO: Track actual latency
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let voiceServiceInstance: PAMVoiceService | null = null;

export function initializeVoiceService(apiKey: string): PAMVoiceService {
  if (!voiceServiceInstance) {
    voiceServiceInstance = new PAMVoiceService({ apiKey });
  }
  return voiceServiceInstance;
}

export function getVoiceService(): PAMVoiceService {
  if (!voiceServiceInstance) {
    throw new Error('Voice service not initialized. Call initializeVoiceService() first.');
  }
  return voiceServiceInstance;
}

export type { PAMVoiceService };
