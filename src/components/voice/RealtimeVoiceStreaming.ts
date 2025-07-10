/**
 * Real-time Voice Streaming System
 * WebSocket + WebRTC for ultra-low latency voice communication
 */

import { VoiceActivityDetector } from './VoiceActivityDetector';
import { NoiseCancellation } from './NoiseCancellation';

interface StreamingConfig {
  sampleRate: number;
  bitRate: number;
  channels: number;
  chunkSize: number;
  bufferSize: number;
  maxLatency: number;
  enableVAD: boolean;
  enableNoiseReduction: boolean;
}

interface VoiceChunk {
  id: string;
  timestamp: number;
  data: ArrayBuffer;
  duration: number;
  isSpeech: boolean;
  isEndOfUtterance: boolean;
}

interface StreamingCallbacks {
  onTranscription?: (text: string, isFinal: boolean) => void;
  onResponse?: (response: string, audioData?: ArrayBuffer) => void;
  onLatencyUpdate?: (latency: number) => void;
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  onTurnDetected?: (userTurnEnded: boolean) => void;
  onError?: (error: Error) => void;
}

export class RealtimeVoiceStreaming {
  private config: StreamingConfig;
  private callbacks: StreamingCallbacks;
  private audioContext: AudioContext;
  private websocket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  
  // Voice processing components
  private vad: VoiceActivityDetector | null = null;
  private noiseCancellation: NoiseCancellation | null = null;
  private processedStream: MediaStream | null = null;
  
  // Streaming state
  private isStreaming = false;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private chunkQueue: VoiceChunk[] = [];
  private currentUtteranceId = '';
  private lastActivityTime = 0;
  private latencyMeasurements: number[] = [];
  
  // Audio processing
  private audioWorklet: AudioWorkletNode | null = null;
  private compressionWorker: Worker | null = null;

  constructor(config: Partial<StreamingConfig> = {}, callbacks: StreamingCallbacks = {}) {
    this.config = {
      sampleRate: 16000,
      bitRate: 32000,
      channels: 1,
      chunkSize: 1024,
      bufferSize: 4096,
      maxLatency: 200, // ms
      enableVAD: true,
      enableNoiseReduction: true,
      ...config
    };
    
    this.callbacks = callbacks;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.config.sampleRate,
      latencyHint: 'interactive'
    });
  }

  async start(websocketUrl: string): Promise<void> {
    console.log('🎙️ Starting real-time voice streaming...');
    
    try {
      // Get microphone access
      await this.initializeAudio();
      
      // Setup voice processing pipeline
      await this.setupProcessingPipeline();
      
      // Connect WebSocket
      await this.connectWebSocket(websocketUrl);
      
      // Start streaming
      this.startStreaming();
      
      console.log('✅ Real-time voice streaming started');
    } catch (error) {
      console.error('❌ Failed to start voice streaming:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping real-time voice streaming...');
    
    this.isStreaming = false;
    
    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Stop voice processing
    this.vad?.stop();
    this.noiseCancellation?.stop();
    
    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    // Stop audio stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // Cleanup workers
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }
    
    this.updateConnectionStatus('disconnected');
  }

  private async initializeAudio(): Promise<void> {
    console.log('🎤 Initializing audio capture...');
    
    const constraints: MediaStreamConstraints = {
      audio: {
        sampleRate: this.config.sampleRate,
        channelCount: this.config.channels,
        echoCancellation: true,
        noiseSuppression: false, // We'll handle this ourselves
        autoGainControl: true,
        latency: 0.01 // 10ms target latency
      }
    };
    
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('✅ Audio stream acquired');
  }

  private async setupProcessingPipeline(): Promise<void> {
    console.log('🔧 Setting up voice processing pipeline...');
    
    if (!this.stream) throw new Error('No audio stream available');
    
    let processedStream = this.stream;
    
    // Apply noise cancellation
    if (this.config.enableNoiseReduction) {
      this.noiseCancellation = new NoiseCancellation(this.audioContext);
      processedStream = await this.noiseCancellation.start(processedStream);
      console.log('✅ Noise cancellation enabled');
    }
    
    // Setup Voice Activity Detection
    if (this.config.enableVAD) {
      this.vad = new VoiceActivityDetector({
        sampleRate: this.config.sampleRate,
        frameSize: 512,
        threshold: 0.01,
        minSpeechFrames: 3,
        minSilenceFrames: 8
      });
      
      this.vad.setCallbacks({
        onSpeechStart: () => {
          console.log('🗣️ Speech started');
          this.currentUtteranceId = this.generateUtteranceId();
          this.lastActivityTime = Date.now();
        },
        onSpeechEnd: () => {
          console.log('🤐 Speech ended');
          this.sendEndOfUtterance();
        },
        onTurnDetected: (turnEnded) => {
          if (turnEnded) {
            console.log('🔄 User turn detected - ready for AI response');
            this.callbacks.onTurnDetected?.(true);
          }
        }
      });
      
      await this.vad.start(processedStream);
      console.log('✅ Voice Activity Detection enabled');
    }
    
    this.processedStream = processedStream;
  }

  private async connectWebSocket(url: string): Promise<void> {
    console.log('🔌 Connecting to voice streaming WebSocket...');
    this.updateConnectionStatus('connecting');
    
    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(url);
      this.websocket.binaryType = 'arraybuffer';
      
      this.websocket.onopen = () => {
        console.log('✅ WebSocket connected');
        this.updateConnectionStatus('connected');
        
        // Send initial configuration
        this.sendMessage({
          type: 'config',
          config: {
            sampleRate: this.config.sampleRate,
            channels: this.config.channels,
            format: 'pcm_s16le'
          }
        });
        
        resolve();
      };
      
      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };
      
      this.websocket.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.updateConnectionStatus('disconnected');
      };
      
      this.websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.updateConnectionStatus('error');
        reject(error);
      };
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.connectionStatus === 'connecting') {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  private startStreaming(): void {
    if (!this.processedStream) throw new Error('No processed stream available');
    
    console.log('📡 Starting audio streaming...');
    this.isStreaming = true;
    
    // Setup MediaRecorder for efficient audio capture
    const options = {
      mimeType: 'audio/webm;codecs=pcm',
      bitsPerSecond: this.config.bitRate
    };
    
    this.mediaRecorder = new MediaRecorder(this.processedStream, options);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.isStreaming) {
        this.processAudioChunk(event.data);
      }
    };
    
    this.mediaRecorder.start(50); // Capture chunks every 50ms for low latency
  }

  private async processAudioChunk(blob: Blob): Promise<void> {
    const arrayBuffer = await blob.arrayBuffer();
    const timestamp = Date.now();
    
    // Check if this chunk contains speech (if VAD is enabled)
    const isSpeech = this.vad ? this.vad.getCurrentState().isSpeaking : true;
    
    // Only send if there's speech activity or VAD is disabled
    if (isSpeech || !this.config.enableVAD) {
      const chunk: VoiceChunk = {
        id: this.generateChunkId(),
        timestamp,
        data: arrayBuffer,
        duration: 50, // 50ms chunks
        isSpeech,
        isEndOfUtterance: false
      };
      
      this.sendVoiceChunk(chunk);
      this.lastActivityTime = timestamp;
    }
  }

  private sendVoiceChunk(chunk: VoiceChunk): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Send metadata first
    this.sendMessage({
      type: 'audio_chunk',
      id: chunk.id,
      utterance_id: this.currentUtteranceId,
      timestamp: chunk.timestamp,
      duration: chunk.duration,
      is_speech: chunk.isSpeech,
      is_end_of_utterance: chunk.isEndOfUtterance
    });
    
    // Send binary audio data
    this.websocket.send(chunk.data);
    
    // Measure latency
    this.measureLatency(chunk.timestamp);
  }

  private sendEndOfUtterance(): void {
    this.sendMessage({
      type: 'end_of_utterance',
      utterance_id: this.currentUtteranceId,
      timestamp: Date.now()
    });
  }

  private sendMessage(message: any): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    if (typeof event.data === 'string') {
      // JSON message
      try {
        const message = JSON.parse(event.data);
        this.handleJsonMessage(message);
      } catch (error) {
        console.error('❌ Failed to parse WebSocket message:', error);
      }
    } else {
      // Binary audio data (TTS response)
      this.handleAudioResponse(event.data);
    }
  }

  private handleJsonMessage(message: any): void {
    switch (message.type) {
      case 'transcription':
        this.callbacks.onTranscription?.(message.text, message.is_final);
        break;
        
      case 'response':
        this.callbacks.onResponse?.(message.text, message.audio_data);
        break;
        
      case 'latency':
        this.updateLatencyMetrics(message.latency);
        break;
        
      case 'error':
        console.error('❌ Server error:', message.error);
        this.callbacks.onError?.(new Error(message.error));
        break;
        
      default:
        console.log('📥 Unknown message type:', message.type);
    }
  }

  private handleAudioResponse(audioData: ArrayBuffer): void {
    // Play TTS response immediately
    this.playAudioResponse(audioData);
  }

  private async playAudioResponse(audioData: ArrayBuffer): Promise<void> {
    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
      
      console.log('🔊 Playing TTS response');
    } catch (error) {
      console.error('❌ Failed to play audio response:', error);
    }
  }

  private measureLatency(originalTimestamp: number): void {
    const latency = Date.now() - originalTimestamp;
    this.latencyMeasurements.push(latency);
    
    // Keep only last 10 measurements
    if (this.latencyMeasurements.length > 10) {
      this.latencyMeasurements.shift();
    }
    
    const avgLatency = this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length;
    this.callbacks.onLatencyUpdate?.(avgLatency);
    
    // Warn if latency is too high
    if (avgLatency > this.config.maxLatency) {
      console.warn(`⚠️ High latency detected: ${avgLatency.toFixed(1)}ms`);
    }
  }

  private updateLatencyMetrics(serverLatency: number): void {
    console.log(`📊 Server processing latency: ${serverLatency}ms`);
  }

  private updateConnectionStatus(status: typeof this.connectionStatus): void {
    this.connectionStatus = status;
    this.callbacks.onConnectionStatusChange?.(status);
  }

  private generateUtteranceId(): string {
    return `utterance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API
  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  getLatencyStats(): { current: number; average: number; max: number } {
    if (this.latencyMeasurements.length === 0) {
      return { current: 0, average: 0, max: 0 };
    }
    
    const current = this.latencyMeasurements[this.latencyMeasurements.length - 1];
    const average = this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length;
    const max = Math.max(...this.latencyMeasurements);
    
    return { current, average, max };
  }

  getVADState(): any {
    return this.vad?.getCurrentState() || null;
  }

  isNoiseReductionActive(): boolean {
    return this.noiseCancellation?.isProfiled() || false;
  }

  forceNoiseProfileUpdate(): void {
    this.noiseCancellation?.forceNoiseProfileUpdate();
  }

  // Manual controls
  mute(): void {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
  }

  unmute(): void {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
  }
}