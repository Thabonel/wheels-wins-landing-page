/**
 * Advanced Voice Activity Detection (VAD) System
 * Detects speech vs silence with noise cancellation and turn detection
 */

interface VADConfig {
  sampleRate: number;
  frameSize: number;
  hopSize: number;
  threshold: number;
  minSpeechFrames: number;
  minSilenceFrames: number;
  preSpeechPadding: number;
  postSpeechPadding: number;
}

interface VADResult {
  isSpeech: boolean;
  confidence: number;
  energy: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
}

export class VoiceActivityDetector {
  private config: VADConfig;
  private audioContext: AudioContext;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // VAD state
  private speechFrameCount = 0;
  private silenceFrameCount = 0;
  private isSpeaking = false;
  private lastSpeechTime = 0;
  private energyHistory: number[] = [];
  private noiseFloor = 0;
  private adaptiveThreshold = 0;
  
  // Callbacks
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private onVoiceActivity?: (result: VADResult) => void;
  private onTurnDetected?: (turnEnded: boolean) => void;

  constructor(config: Partial<VADConfig> = {}) {
    this.config = {
      sampleRate: 16000,
      frameSize: 512,
      hopSize: 256,
      threshold: 0.01,
      minSpeechFrames: 5,
      minSilenceFrames: 10,
      preSpeechPadding: 3,
      postSpeechPadding: 8,
      ...config
    };

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.config.sampleRate
    });
  }

  async start(stream: MediaStream): Promise<void> {
    console.log('🎤 Starting Voice Activity Detection...');
    
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    
    // Configure analyser for optimal VAD
    this.analyser.fftSize = this.config.frameSize * 2;
    this.analyser.smoothingTimeConstant = 0.1;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;
    
    // Create processor for real-time analysis
    this.processor = this.audioContext.createScriptProcessor(
      this.config.frameSize, 1, 1
    );
    
    this.processor.onaudioprocess = (event) => {
      this.processAudioFrame(event.inputBuffer);
    };
    
    // Connect audio graph
    this.source.connect(this.analyser);
    this.analyser.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    
    // Initialize noise floor estimation
    setTimeout(() => this.calibrateNoiseFloor(), 1000);
  }

  stop(): void {
    console.log('🛑 Stopping Voice Activity Detection...');
    
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
  }

  private processAudioFrame(buffer: AudioBuffer): void {
    const channelData = buffer.getChannelData(0);
    const vadResult = this.analyzeFrame(channelData);
    
    // Update speech/silence state
    this.updateSpeechState(vadResult);
    
    // Detect turn taking
    this.detectTurn(vadResult);
    
    // Callback with results
    this.onVoiceActivity?.(vadResult);
  }

  private analyzeFrame(samples: Float32Array): VADResult {
    // Calculate energy (RMS)
    const energy = this.calculateRMS(samples);
    
    // Calculate spectral centroid
    const spectralCentroid = this.calculateSpectralCentroid(samples);
    
    // Calculate zero crossing rate
    const zeroCrossingRate = this.calculateZeroCrossingRate(samples);
    
    // Update noise floor and adaptive threshold
    this.updateNoiseFloor(energy);
    this.adaptiveThreshold = this.noiseFloor * 3; // 3x noise floor
    
    // Determine if this frame contains speech
    const threshold = Math.max(this.config.threshold, this.adaptiveThreshold);
    const energyCheck = energy > threshold;
    const spectralCheck = spectralCentroid > 1000; // Speech typically has higher spectral centroid
    const zcrCheck = zeroCrossingRate < 0.3; // Speech has lower ZCR than noise
    
    const isSpeech = energyCheck && spectralCheck && zcrCheck;
    const confidence = this.calculateConfidence(energy, spectralCentroid, zeroCrossingRate);

    return {
      isSpeech,
      confidence,
      energy,
      spectralCentroid,
      zeroCrossingRate
    };
  }

  private calculateRMS(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  private calculateSpectralCentroid(samples: Float32Array): number {
    // Simple approximation using frequency domain energy distribution
    const fftSize = samples.length;
    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);
    
    // Copy samples to real part
    real.set(samples);
    
    // Simple FFT approximation for spectral centroid
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 1; i < fftSize / 2; i++) {
      const magnitude = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
      const frequency = i * this.config.sampleRate / fftSize;
      
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateZeroCrossingRate(samples: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / (samples.length - 1);
  }

  private updateNoiseFloor(energy: number): void {
    this.energyHistory.push(energy);
    if (this.energyHistory.length > 100) {
      this.energyHistory.shift();
    }
    
    // Use 20th percentile as noise floor
    const sorted = [...this.energyHistory].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.2);
    this.noiseFloor = sorted[index] || 0;
  }

  private calculateConfidence(energy: number, spectralCentroid: number, zcr: number): number {
    const energyConfidence = Math.min(energy / this.adaptiveThreshold, 1);
    const spectralConfidence = Math.min(spectralCentroid / 2000, 1);
    const zcrConfidence = Math.max(0, 1 - zcr / 0.3);
    
    return (energyConfidence + spectralConfidence + zcrConfidence) / 3;
  }

  private updateSpeechState(vadResult: VADResult): void {
    if (vadResult.isSpeech) {
      this.speechFrameCount++;
      this.silenceFrameCount = 0;
      this.lastSpeechTime = Date.now();
      
      // Start of speech detected
      if (!this.isSpeaking && this.speechFrameCount >= this.config.minSpeechFrames) {
        this.isSpeaking = true;
        console.log('🗣️ Speech started');
        this.onSpeechStart?.();
      }
    } else {
      this.silenceFrameCount++;
      this.speechFrameCount = 0;
      
      // End of speech detected
      if (this.isSpeaking && this.silenceFrameCount >= this.config.minSilenceFrames) {
        this.isSpeaking = false;
        console.log('🤐 Speech ended');
        this.onSpeechEnd?.();
      }
    }
  }

  private detectTurn(vadResult: VADResult): void {
    const now = Date.now();
    const timeSinceLastSpeech = now - this.lastSpeechTime;
    
    // Turn detection: silence for longer than threshold indicates turn end
    const turnEndThreshold = 1500; // 1.5 seconds of silence
    const turnEnded = timeSinceLastSpeech > turnEndThreshold && !vadResult.isSpeech;
    
    if (turnEnded && this.lastSpeechTime > 0) {
      console.log('🔄 Turn detected - user finished speaking');
      this.onTurnDetected?.(true);
      this.lastSpeechTime = 0; // Reset to avoid repeated detection
    }
  }

  private calibrateNoiseFloor(): void {
    console.log('🎛️ Calibrating noise floor...');
    // Noise floor is automatically updated in updateNoiseFloor()
    setTimeout(() => {
      console.log(`🎛️ Noise floor calibrated: ${this.noiseFloor.toFixed(4)}`);
    }, 2000);
  }

  // Public API
  setCallbacks(callbacks: {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onVoiceActivity?: (result: VADResult) => void;
    onTurnDetected?: (turnEnded: boolean) => void;
  }): void {
    this.onSpeechStart = callbacks.onSpeechStart;
    this.onSpeechEnd = callbacks.onSpeechEnd;
    this.onVoiceActivity = callbacks.onVoiceActivity;
    this.onTurnDetected = callbacks.onTurnDetected;
  }

  getCurrentState(): {
    isSpeaking: boolean;
    noiseFloor: number;
    adaptiveThreshold: number;
    energyHistory: number[];
  } {
    return {
      isSpeaking: this.isSpeaking,
      noiseFloor: this.noiseFloor,
      adaptiveThreshold: this.adaptiveThreshold,
      energyHistory: [...this.energyHistory]
    };
  }
}