/**
 * Advanced Wake Word Detection System
 * Inspired by Kalliope-Project architecture with local processing
 * Supports multiple wake words: "Hey PAM", "PAM", "Assistant"
 */

interface WakeWordConfig {
  enabled: boolean;
  sensitivity: number; // 0.0 to 1.0
  wakeWords: string[];
  cooldownMs: number;
  continuousListening: boolean;
  noiseGateThreshold: number;
  bufferDurationMs: number;
  modelPath?: string;
}

interface WakeWordResult {
  detected: boolean;
  keyword: string;
  confidence: number;
  timestamp: number;
  audioBuffer?: Float32Array;
}

interface WakeWordCallbacks {
  onWakeWordDetected?: (result: WakeWordResult) => void;
  onListeningStateChange?: (isListening: boolean) => void;
  onError?: (error: Error) => void;
  onCalibrationComplete?: (noiseLevel: number) => void;
}

export class WakeWordDetector {
  private config: WakeWordConfig;
  private callbacks: WakeWordCallbacks;
  private audioContext: AudioContext;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // Wake word detection state
  private isInitialized = false;
  private isListening = false;
  private isCalibrating = false;
  private lastDetectionTime = 0;
  private noiseFloor = 0;
  private audioBuffer: Float32Array[] = [];
  private bufferSize = 0;
  
  // Audio processing
  private fftSize = 2048;
  private frequencyData = new Uint8Array(this.fftSize / 2);
  private timeData = new Uint8Array(this.fftSize);
  
  // Wake word patterns (simplified keyword spotting)
  private keywordPatterns: Map<string, number[]> = new Map();
  private keywordThresholds: Map<string, number> = new Map();

  constructor(config: Partial<WakeWordConfig> = {}, callbacks: WakeWordCallbacks = {}) {
    this.config = {
      enabled: true,
      sensitivity: 0.7,
      wakeWords: ["hey pam", "pam", "assistant"],
      cooldownMs: 2000,
      continuousListening: true,
      noiseGateThreshold: 0.01,
      bufferDurationMs: 3000, // 3 seconds of audio buffer
      ...config
    };
    
    this.callbacks = callbacks;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
      latencyHint: 'interactive'
    });
    
    this.bufferSize = Math.ceil(this.config.bufferDurationMs * 16); // 16 samples per ms at 16kHz
    this.initializeKeywordPatterns();
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    console.log('🎯 Initializing Wake Word Detection...');
    
    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false, // We handle this ourselves
          autoGainControl: true
        }
      });

      // Setup audio processing chain
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.processor = this.audioContext.createScriptProcessor(1024, 1, 1);

      // Configure analyser for wake word detection
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.3;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // Setup audio processing
      this.processor.onaudioprocess = (event) => {
        this.processAudioFrame(event.inputBuffer);
      };

      // Connect audio graph
      this.source.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isInitialized = true;
      
      // Calibrate noise floor
      await this.calibrateNoiseFloor();
      
      console.log('✅ Wake Word Detection initialized');
      return true;

    } catch (error) {
      console.error('❌ Wake Word Detection initialization failed:', error);
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  async startListening(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Wake Word Detector not initialized');
    }

    if (this.isListening) {
      return;
    }

    console.log('👂 Starting wake word listening...');
    this.isListening = true;
    this.callbacks.onListeningStateChange?.(true);
  }

  stopListening(): void {
    if (!this.isListening) {
      return;
    }

    console.log('🔇 Stopping wake word listening...');
    this.isListening = false;
    this.callbacks.onListeningStateChange?.(false);
  }

  destroy(): void {
    console.log('🛑 Destroying Wake Word Detector...');
    
    this.stopListening();
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    this.isInitialized = false;
  }

  private initializeKeywordPatterns(): void {
    // Simple keyword pattern matching based on audio features
    // In production, this would use a trained neural network model
    
    const patterns = {
      "hey pam": [0.2, 0.8, 0.6, 0.9], // Simplified energy pattern
      "pam": [0.7, 0.9],
      "assistant": [0.3, 0.6, 0.4, 0.8, 0.5]
    };
    
    const thresholds = {
      "hey pam": 0.75,
      "pam": 0.80,
      "assistant": 0.70
    };
    
    for (const [keyword, pattern] of Object.entries(patterns)) {
      this.keywordPatterns.set(keyword, pattern);
      this.keywordThresholds.set(keyword, thresholds[keyword] * this.config.sensitivity);
    }
  }

  private async calibrateNoiseFloor(): Promise<void> {
    console.log('🎛️ Calibrating noise floor for wake word detection...');
    this.isCalibrating = true;
    
    const samples: number[] = [];
    const calibrationTime = 2000; // 2 seconds
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const calibrationInterval = setInterval(() => {
        if (!this.analyser) {
          clearInterval(calibrationInterval);
          resolve();
          return;
        }
        
        this.analyser.getByteTimeDomainData(this.timeData);
        
        // Calculate RMS energy
        let sum = 0;
        for (let i = 0; i < this.timeData.length; i++) {
          const normalized = (this.timeData[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / this.timeData.length);
        samples.push(rms);
        
        if (Date.now() - startTime >= calibrationTime) {
          clearInterval(calibrationInterval);
          
          // Calculate noise floor as 80th percentile
          samples.sort((a, b) => a - b);
          const index = Math.floor(samples.length * 0.8);
          this.noiseFloor = samples[index] || 0.01;
          
          this.isCalibrating = false;
          console.log(`🎛️ Noise floor calibrated: ${this.noiseFloor.toFixed(4)}`);
          this.callbacks.onCalibrationComplete?.(this.noiseFloor);
          resolve();
        }
      }, 50);
    });
  }

  private processAudioFrame(buffer: AudioBuffer): void {
    if (!this.isListening || this.isCalibrating) {
      return;
    }

    const inputData = buffer.getChannelData(0);
    
    // Add to rolling buffer
    this.addToBuffer(inputData);
    
    // Check for wake word patterns
    this.detectWakeWords(inputData);
  }

  private addToBuffer(audioData: Float32Array): void {
    // Add new audio data to circular buffer
    this.audioBuffer.push(new Float32Array(audioData));
    
    // Maintain buffer size
    while (this.audioBuffer.length > this.bufferSize / 1024) {
      this.audioBuffer.shift();
    }
  }

  private detectWakeWords(audioData: Float32Array): void {
    // Calculate audio features
    const features = this.extractAudioFeatures(audioData);
    
    // Check cooldown period
    const now = Date.now();
    if (now - this.lastDetectionTime < this.config.cooldownMs) {
      return;
    }
    
    // Test each wake word pattern
    for (const keyword of this.config.wakeWords) {
      const confidence = this.matchKeywordPattern(keyword, features);
      const threshold = this.keywordThresholds.get(keyword) || 0.7;
      
      if (confidence > threshold) {
        console.log(`🎯 Wake word detected: "${keyword}" (confidence: ${confidence.toFixed(2)})`);
        
        this.lastDetectionTime = now;
        
        // Collect recent audio buffer
        const recentAudio = this.getRecentAudioBuffer();
        
        const result: WakeWordResult = {
          detected: true,
          keyword,
          confidence,
          timestamp: now,
          audioBuffer: recentAudio
        };
        
        this.callbacks.onWakeWordDetected?.(result);
        
        // Stop listening briefly to avoid repeated detections
        if (!this.config.continuousListening) {
          this.stopListening();
          setTimeout(() => {
            this.startListening();
          }, this.config.cooldownMs);
        }
        
        break; // Only detect one wake word per frame
      }
    }
  }

  private extractAudioFeatures(audioData: Float32Array): number[] {
    // Simple feature extraction for wake word detection
    // In production, this would use MFCC or other advanced features
    
    const features: number[] = [];
    
    // 1. RMS Energy
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    features.push(Math.max(0, (rms - this.noiseFloor) / (0.5 - this.noiseFloor)));
    
    // 2. Zero Crossing Rate
    let crossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) {
        crossings++;
      }
    }
    const zcr = crossings / (audioData.length - 1);
    features.push(Math.min(1, zcr / 0.5));
    
    // 3. Spectral Features (simplified)
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);
      
      // Low frequency energy (0-1kHz)
      let lowFreq = 0;
      for (let i = 0; i < this.frequencyData.length / 8; i++) {
        lowFreq += this.frequencyData[i];
      }
      features.push(lowFreq / (this.frequencyData.length / 8 * 255));
      
      // Mid frequency energy (1-4kHz)
      let midFreq = 0;
      for (let i = this.frequencyData.length / 8; i < this.frequencyData.length / 2; i++) {
        midFreq += this.frequencyData[i];
      }
      features.push(midFreq / (this.frequencyData.length * 3 / 8 * 255));
    }
    
    return features;
  }

  private matchKeywordPattern(keyword: string, features: number[]): number {
    const pattern = this.keywordPatterns.get(keyword);
    if (!pattern || features.length === 0) {
      return 0;
    }
    
    // Simple pattern matching - calculate similarity
    // In production, this would use dynamic time warping or neural networks
    
    let similarity = 0;
    const minLength = Math.min(pattern.length, features.length);
    
    for (let i = 0; i < minLength; i++) {
      const diff = Math.abs(pattern[i] - features[i]);
      similarity += Math.max(0, 1 - diff);
    }
    
    return similarity / minLength;
  }

  private getRecentAudioBuffer(): Float32Array {
    // Combine recent audio buffers
    if (this.audioBuffer.length === 0) {
      return new Float32Array(0);
    }
    
    const totalLength = this.audioBuffer.reduce((sum, buffer) => sum + buffer.length, 0);
    const combined = new Float32Array(totalLength);
    
    let offset = 0;
    for (const buffer of this.audioBuffer) {
      combined.set(buffer, offset);
      offset += buffer.length;
    }
    
    return combined;
  }

  // Public API methods
  updateConfig(newConfig: Partial<WakeWordConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize patterns if wake words changed
    if (newConfig.wakeWords || newConfig.sensitivity) {
      this.initializeKeywordPatterns();
    }
  }

  getConfig(): WakeWordConfig {
    return { ...this.config };
  }

  isActive(): boolean {
    return this.isInitialized && this.isListening;
  }

  getNoiseFloor(): number {
    return this.noiseFloor;
  }

  getCurrentAudioLevel(): number {
    if (!this.analyser) {
      return 0;
    }
    
    this.analyser.getByteTimeDomainData(this.timeData);
    
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const normalized = (this.timeData[i] - 128) / 128;
      sum += normalized * normalized;
    }
    
    return Math.sqrt(sum / this.timeData.length);
  }

  // Manual trigger for testing
  simulateWakeWord(keyword: string): void {
    if (this.config.wakeWords.includes(keyword)) {
      const result: WakeWordResult = {
        detected: true,
        keyword,
        confidence: 1.0,
        timestamp: Date.now()
      };
      
      console.log(`🧪 Simulated wake word: "${keyword}"`);
      this.callbacks.onWakeWordDetected?.(result);
    }
  }
}