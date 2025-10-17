/**
 * OpenAI Realtime API Client
 * DIRECT WebSocket connection to OpenAI (zero added latency!)
 * No backend proxy, no VAD, no TTS/STT - all handled by OpenAI
 */

import { logger } from '@/lib/logger';

interface SessionConfig {
  session_token: string;
  expires_at: string;
  ws_url: string;
  model: string;
}

export class OpenAIRealtimeService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sessionToken: string | null = null;
  private audioQueue: AudioBufferSourceNode[] = [];

  constructor(
    private userId: string,
    private authToken: string,
    private apiBaseUrl: string
  ) {}

  async connect(): Promise<void> {
    try {
      logger.debug('🔌 Connecting to OpenAI Realtime API...');

      // Step 1: Get ephemeral session token from OUR backend
      const response = await fetch(
        `${this.apiBaseUrl}/api/v1/pam/realtime/create-session`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const config: SessionConfig = await response.json();
      this.sessionToken = config.session_token;

      logger.debug('✅ Got session token from backend');

      // Step 2: Connect DIRECTLY to OpenAI with session token
      this.ws = new WebSocket(
        `${config.ws_url}?model=${config.model}`
      );

      // WebSocket event handlers
      this.ws.onopen = () => {
        logger.info('✅ Connected directly to OpenAI Realtime API');

        // Send auth with session token
        this.ws?.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: '',  // Already set in backend
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            }
          }
        }));
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleOpenAIEvent(data);
      };

      this.ws.onerror = (error) => {
        logger.error('❌ WebSocket error:', error);
      };

      this.ws.onclose = () => {
        logger.info('🔌 Disconnected from OpenAI');
        this.cleanup();
      };

      // Initialize audio context
      this.audioContext = new AudioContext({ sampleRate: 24000 });

    } catch (error) {
      logger.error('❌ Failed to connect to OpenAI:', error);
      throw error;
    }
  }

  private async handleOpenAIEvent(event: any): Promise<void> {
    const eventType = event.type;

    try {
      // Audio response from OpenAI
      if (eventType === 'response.audio.delta') {
        await this.playAudioChunk(event.delta);
      }

      // OpenAI requests tool call
      else if (eventType === 'response.function_call_arguments.done') {
        await this.executeTool(
          event.call_id,
          event.name,
          JSON.parse(event.arguments)
        );
      }

      // Session created confirmation
      else if (eventType === 'session.created') {
        logger.debug('✅ OpenAI session ready');
      }

      // Audio transcription (for debugging)
      else if (eventType === 'conversation.item.input_audio_transcription.completed') {
        logger.debug(`🎤 User said: "${event.transcript}"`);
      }

      // Response completed
      else if (eventType === 'response.done') {
        logger.debug('✅ Response completed');
      }

      // Error handling
      else if (eventType === 'error') {
        logger.error('❌ OpenAI error:', event.error);
      }

    } catch (error) {
      logger.error(`❌ Error handling event ${eventType}:`, error);
    }
  }

  private async executeTool(
    callId: string,
    toolName: string,
    args: any
  ): Promise<void> {
    try {
      logger.debug(`🔧 Executing tool: ${toolName}`);

      // Call OUR backend to execute the tool
      const response = await fetch(
        `${this.apiBaseUrl}/api/v1/pam/tools/execute/${toolName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(args)
        }
      );

      const result = await response.json();

      logger.debug(`✅ Tool ${toolName} executed:`, result);

      // Send result back to OpenAI
      this.ws?.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(result)
        }
      }));

      // Trigger OpenAI to generate response
      this.ws?.send(JSON.stringify({
        type: 'response.create'
      }));

    } catch (error) {
      logger.error(`❌ Tool execution failed: ${toolName}`, error);

      // Send error back to OpenAI
      this.ws?.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify({
            success: false,
            error: String(error)
          })
        }
      }));
    }
  }

  async startVoiceMode(): Promise<void> {
    try {
      logger.debug('🎤 Starting voice mode...');

      // Get microphone (24kHz PCM16 format for OpenAI)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (!this.audioContext) {
        throw new Error('Audio context not initialized');
      }

      // Stream audio directly to OpenAI
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const audioData = e.inputBuffer.getChannelData(0);

        // Convert Float32Array to PCM16
        const pcm16 = this.floatTo16BitPCM(audioData);

        // Send to OpenAI
        this.ws?.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: this.arrayBufferToBase64(pcm16)
        }));
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      logger.info('✅ Voice mode active (ChatGPT quality, zero latency!)');

    } catch (error) {
      logger.error('❌ Failed to start voice mode:', error);
      throw error;
    }
  }

  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  private arrayBufferToBase64(buffer: Int16Array): string {
    const bytes = new Uint8Array(buffer.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private async playAudioChunk(base64Audio: string): Promise<void> {
    try {
      if (!this.audioContext) {
        throw new Error('Audio context not initialized');
      }

      // Decode base64 audio
      const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));

      // Convert to AudioBuffer and play
      const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);

      // Track for cleanup
      this.audioQueue.push(source);

    } catch (error) {
      logger.error('❌ Failed to play audio chunk:', error);
    }
  }

  stopVoiceMode(): void {
    logger.debug('🛑 Stopping voice mode...');

    // Stop microphone
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Stop all playing audio
    this.audioQueue.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Already stopped
      }
    });
    this.audioQueue = [];

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    logger.info('✅ Voice mode stopped');
  }

  private cleanup(): void {
    this.stopVoiceMode();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
