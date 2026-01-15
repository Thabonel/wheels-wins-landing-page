import { useVoiceStore } from '@/stores/useVoiceStore';

/**
 * @deprecated LEGACY - Do not use in new code.
 *
 * This VADService was part of the legacy multi-provider voice architecture.
 * OpenAI Realtime handles voice activity detection (server_vad) internally.
 *
 * USE INSTEAD: PAMVoiceHybridService from '@/services/pamVoiceHybridService'
 *
 * This file is scheduled for removal in Q2 2026.
 * See VOICE_RATIONALIZATION_PLAN.md for details.
 *
 * ---
 * Original description:
 * Voice Activity Detection (VAD) Service
 *
 * Implements intelligent speech detection for natural conversation flow
 * Based on research showing Silero VAD and WebRTC VAD as best options
 *
 * Features:
 * - Real-time speech detection
 * - Endpointing (detecting when user stops speaking)
 * - Barge-in detection (interrupting agent)
 * - Wake word detection support
 */

export interface VADConfig {
  // VAD algorithm selection
  algorithm: 'webrtc' | 'silero' | 'browser';
  
  // Detection thresholds
  speechThreshold: number; // 0.0-1.0, probability threshold for speech
  silenceDuration: number; // ms, how long silence before endpointing
  minSpeechDuration: number; // ms, minimum duration to consider as speech
  
  // Audio processing
  sampleRate: number; // Hz, audio sample rate
  frameSize: number; // ms, size of audio frames to process
  
  // Features
  enableWakeWord: boolean;
  wakeWords: string[];
  enableContinuousListening: boolean;
  enableEchoCancellation: boolean;
  
  // Callbacks
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onWakeWordDetected?: (word: string) => void;
  onVolumeChange?: (volume: number) => void;
}

export class VADService {
  private static instance: VADService;
  
  private config: VADConfig;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  
  private isSpeaking = false;
  private speechStartTime: number | null = null;
  private speechEndTime: number | null = null;
  private silenceStartTime: number | null = null;
  
  private isListening = false;
  private isProcessing = false;
  private volumeHistory: number[] = [];
  private processInterval: number | null = null;
  
  // WebRTC VAD specific
  private webrtcVAD: any = null;
  
  // Wake word detection
  private wakeWordRecognition: any = null;

  // Singleton pattern
  static getInstance(): VADService {
    if (!VADService.instance) {
      VADService.instance = new VADService();
    }
    return VADService.instance;
  }

  private constructor() {
    // Default configuration
    this.config = {
      algorithm: 'webrtc',
      speechThreshold: 0.6,
      silenceDuration: 800, // ms
      minSpeechDuration: 300, // ms
      sampleRate: 16000,
      frameSize: 30, // ms
      enableWakeWord: false,
      wakeWords: ['hey pam', 'pam', 'hello pam'],
      enableContinuousListening: false,
      enableEchoCancellation: true,
    };
  }

  /**
   * Initialize VAD service
   */
  async initialize(config: Partial<VADConfig> = {}): Promise<void> {
    console.log('🎯 Initializing VAD service...');
    
    this.config = { ...this.config, ...config };
    
    try {
      // Initialize audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate
      });
      
      // Get microphone stream
      await this.initializeMicrophone();
      
      // Initialize chosen VAD algorithm
      switch (this.config.algorithm) {
        case 'webrtc':
          await this.initializeWebRTCVAD();
          break;
        case 'silero':
          await this.initializeSileroVAD();
          break;
        case 'browser':
          this.initializeBrowserVAD();
          break;
      }
      
      // Initialize wake word detection if enabled
      if (this.config.enableWakeWord) {
        this.initializeWakeWordDetection();
      }
      
      console.log('✅ VAD service initialized');
      
    } catch (error) {
      console.error('❌ VAD initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize microphone stream
   */
  private async initializeMicrophone(): Promise<void> {
    console.log('🎤 Requesting microphone for VAD...');
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.config.enableEchoCancellation,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.config.sampleRate,
        },
        video: false
      });
      
      if (!this.audioContext) throw new Error('Audio context not initialized');
      
      // Create audio nodes
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      // Connect nodes
      this.microphone.connect(this.analyser);
      
      console.log('✅ Microphone initialized for VAD');
      
    } catch (error) {
      console.error('❌ Microphone initialization failed:', error);
      throw new Error('Failed to access microphone for VAD');
    }
  }

  /**
   * Initialize WebRTC VAD (lightweight, CPU-efficient)
   */
  private async initializeWebRTCVAD(): Promise<void> {
    console.log('🔧 Initializing WebRTC VAD...');
    
    if (!this.audioContext || !this.microphone) {
      throw new Error('Audio context not initialized');
    }
    
    // Create script processor for WebRTC VAD
    const bufferSize = Math.floor((this.config.frameSize / 1000) * this.config.sampleRate);
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    this.microphone.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    
    // Process audio frames
    this.processor.onaudioprocess = (event) => {
      if (!this.isListening || this.isProcessing) return;
      
      const inputData = event.inputBuffer.getChannelData(0);
      this.processAudioFrame(inputData);
    };
    
    console.log('✅ WebRTC VAD initialized');
  }

  /**
   * Initialize Silero VAD (more accurate, slightly higher CPU)
   */
  private async initializeSileroVAD(): Promise<void> {
    console.log('🔧 Initializing Silero VAD...');
    
    // For production, you would load the actual Silero ONNX model
    // This is a placeholder for the implementation
    console.warn('⚠️ Silero VAD requires ONNX model loading - using WebRTC fallback');
    
    // Fallback to WebRTC VAD
    await this.initializeWebRTCVAD();
  }

  /**
   * Initialize browser-based VAD (simple volume threshold)
   */
  private initializeBrowserVAD(): void {
    console.log('🔧 Initializing browser VAD...');
    
    if (!this.analyser) {
      throw new Error('Analyser not initialized');
    }
    
    // Use simple volume-based detection
    this.processInterval = window.setInterval(() => {
      if (!this.isListening || this.isProcessing) return;
      
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedVolume = average / 255;
      
      this.processVolumeLevel(normalizedVolume);
      
    }, this.config.frameSize);
    
    console.log('✅ Browser VAD initialized');
  }

  /**
   * Process audio frame for speech detection
   */
  private processAudioFrame(audioData: Float32Array): void {
    this.isProcessing = true;
    
    // Calculate RMS (Root Mean Square) for volume
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    const volume = Math.min(1, rms * 10); // Normalize to 0-1
    
    this.processVolumeLevel(volume);
    
    this.isProcessing = false;
  }

  /**
   * Process volume level for speech detection
   */
  private processVolumeLevel(volume: number): void {
    // Update volume history (keep last 10 frames)
    this.volumeHistory.push(volume);
    if (this.volumeHistory.length > 10) {
      this.volumeHistory.shift();
    }
    
    // Calculate average volume
    const avgVolume = this.volumeHistory.reduce((a, b) => a + b, 0) / this.volumeHistory.length;
    
    // Trigger volume callback
    if (this.config.onVolumeChange) {
      this.config.onVolumeChange(avgVolume);
    }
    
    // Update store with audio level
    const store = useVoiceStore.getState();
    store.updateMetrics({ audioLevel: avgVolume * 100 });
    
    // Detect speech based on threshold
    const isSpeechDetected = avgVolume > this.config.speechThreshold;
    
    if (isSpeechDetected && !this.isSpeaking) {
      this.handleSpeechStart();
    } else if (!isSpeechDetected && this.isSpeaking) {
      this.handlePotentialSpeechEnd();
    }
  }

  /**
   * Handle speech start detection
   */
  private handleSpeechStart(): void {
    const now = Date.now();
    
    // Check if this is a continuation of recent speech
    if (this.speechEndTime && (now - this.speechEndTime) < 500) {
      // Continue previous speech segment
      this.speechEndTime = null;
      this.silenceStartTime = null;
      return;
    }
    
    console.log('🗣️ Speech detected');
    
    this.isSpeaking = true;
    this.speechStartTime = now;
    this.silenceStartTime = null;
    
    const store = useVoiceStore.getState();
    store.setUserSpeaking(true);
    store.setSpeechTimes(now);
    
    // Check for barge-in (interruption)
    if (store.agentStatus === 'speaking') {
      console.log('⚠️ User interrupting agent (barge-in)');
      store.handleInterrupt();
    }
    
    // Trigger callback
    if (this.config.onSpeechStart) {
      this.config.onSpeechStart();
    }
  }

  /**
   * Handle potential speech end (silence detected)
   */
  private handlePotentialSpeechEnd(): void {
    const now = Date.now();
    
    if (!this.silenceStartTime) {
      this.silenceStartTime = now;
      return;
    }
    
    const silenceDuration = now - this.silenceStartTime;
    
    // Check if silence duration exceeds threshold
    if (silenceDuration >= this.config.silenceDuration) {
      this.handleSpeechEnd();
    }
  }

  /**
   * Handle speech end detection
   */
  private handleSpeechEnd(): void {
    const now = Date.now();
    
    // Check minimum speech duration
    if (this.speechStartTime) {
      const speechDuration = now - this.speechStartTime;
      if (speechDuration < this.config.minSpeechDuration) {
        // Too short, ignore as noise
        this.resetSpeechState();
        return;
      }
    }
    
    console.log('🔇 Speech ended');
    
    this.isSpeaking = false;
    this.speechEndTime = now;
    
    const store = useVoiceStore.getState();
    store.setUserSpeaking(false);
    store.setSpeechTimes(this.speechStartTime, now);
    
    // Trigger callback
    if (this.config.onSpeechEnd) {
      this.config.onSpeechEnd();
    }
    
    this.resetSpeechState();
  }

  /**
   * Reset speech detection state
   */
  private resetSpeechState(): void {
    this.speechStartTime = null;
    this.silenceStartTime = null;
  }

  /**
   * Initialize wake word detection
   */
  private initializeWakeWordDetection(): void {
    console.log('👂 Initializing wake word detection...');
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('⚠️ Speech recognition not available in this browser');
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.wakeWordRecognition = new SpeechRecognition();
    
    this.wakeWordRecognition.continuous = true;
    this.wakeWordRecognition.interimResults = true;
    this.wakeWordRecognition.lang = 'en-US';
    
    this.wakeWordRecognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')
        .toLowerCase();
      
      // Check for wake words
      for (const wakeWord of this.config.wakeWords) {
        if (transcript.includes(wakeWord.toLowerCase())) {
          console.log(`✨ Wake word detected: "${wakeWord}"`);
          
          if (this.config.onWakeWordDetected) {
            this.config.onWakeWordDetected(wakeWord);
          }
          
          // Activate voice assistant
          const store = useVoiceStore.getState();
          store.setActivationMode('wake_word');
          
          break;
        }
      }
    };
    
    this.wakeWordRecognition.onerror = (event: any) => {
      console.error('❌ Wake word detection error:', event.error);
    };
    
    console.log('✅ Wake word detection initialized');
  }

  /**
   * Start listening for voice activity
   */
  start(): void {
    if (this.isListening) {
      console.log('⚠️ VAD already listening');
      return;
    }
    
    console.log('🎯 VAD started listening');
    
    this.isListening = true;
    
    // Resume audio context if suspended
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Start wake word detection if enabled
    if (this.config.enableWakeWord && this.wakeWordRecognition) {
      this.wakeWordRecognition.start();
    }
    
    const store = useVoiceStore.getState();
    store.setAgentStatus('listening');
  }

  /**
   * Stop listening for voice activity
   */
  stop(): void {
    if (!this.isListening) {
      return;
    }
    
    console.log('🔇 VAD stopped listening');
    
    this.isListening = false;
    
    // Stop wake word detection
    if (this.wakeWordRecognition) {
      this.wakeWordRecognition.stop();
    }
    
    // Reset state
    this.resetSpeechState();
    this.isSpeaking = false;
    
    const store = useVoiceStore.getState();
    store.setUserSpeaking(false);
  }

  /**
   * Pause VAD temporarily (e.g., during agent speech)
   */
  pause(): void {
    console.log('⏸️ VAD paused');
    this.isListening = false;
  }

  /**
   * Resume VAD after pause
   */
  resume(): void {
    console.log('▶️ VAD resumed');
    this.isListening = true;
  }

  /**
   * Clean up and destroy VAD service
   */
  destroy(): void {
    console.log('🧹 Destroying VAD service...');
    
    this.stop();
    
    // Clear interval
    if (this.processInterval !== null) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    
    // Disconnect audio nodes
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Stop media stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // Clean up wake word recognition
    if (this.wakeWordRecognition) {
      this.wakeWordRecognition.stop();
      this.wakeWordRecognition = null;
    }
    
    console.log('✅ VAD service destroyed');
  }

  /**
   * Get current VAD status
   */
  getStatus(): {
    isListening: boolean;
    isSpeaking: boolean;
    algorithm: string;
    volumeLevel: number;
  } {
    const currentVolume = this.volumeHistory.length > 0 
      ? this.volumeHistory[this.volumeHistory.length - 1] 
      : 0;
    
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      algorithm: this.config.algorithm,
      volumeLevel: currentVolume
    };
  }

  /**
   * Update VAD configuration
   */
  updateConfig(config: Partial<VADConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ VAD configuration updated:', config);
  }
}

// Export singleton instance
export const vadService = VADService.getInstance();