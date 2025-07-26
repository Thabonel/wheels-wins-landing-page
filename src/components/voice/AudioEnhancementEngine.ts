/**
 * Audio Enhancement Engine
 * Advanced noise reduction, voice enhancement, and real-time audio processing
 * Inspired by professional audio processing and modern speech enhancement algorithms
 */

interface AudioEnhancementConfig {
  enabled: boolean;
  noiseReduction: {
    enabled: boolean;
    algorithm: 'spectral_subtraction' | 'wiener_filter' | 'adaptive' | 'neural';
    aggressiveness: number; // 0.0 to 1.0
    preserveVoice: boolean;
    adaptiveThreshold: boolean;
  };
  voiceEnhancement: {
    enabled: boolean;
    preEmphasis: number;
    compression: {
      enabled: boolean;
      ratio: number;
      threshold: number;
      attack: number;
      release: number;
    };
    equalization: {
      enabled: boolean;
      bands: EqualizerBand[];
    };
    normalization: boolean;
  };
  realTimeProcessing: boolean;
  latencyOptimized: boolean;
  qualityPreset: 'ultra_low_latency' | 'balanced' | 'high_quality';
}

interface EqualizerBand {
  frequency: number; // Hz
  gain: number; // dB
  q: number; // Quality factor
  type: 'peak' | 'lowpass' | 'highpass' | 'bandpass' | 'notch';
}

interface AudioEnhancementResult {
  enhancedAudio: Float32Array;
  originalAudio: Float32Array;
  processingMetrics: {
    noiseReductionDb: number;
    signalEnhancement: number;
    spectralClarity: number;
    dynamicRange: number;
    processingLatency: number;
  };
  qualityMetrics: {
    snr: number;
    thd: number; // Total harmonic distortion
    clarity: number;
    naturalness: number;
  };
}

interface NoiseProfile {
  spectrum: Float32Array;
  energy: number;
  characteristics: {
    isStationary: boolean;
    bandwidth: number;
    peakFrequency: number;
    spectralTilt: number;
  };
  timestamp: number;
  confidence: number;
}

interface AudioCallbacks {
  onAudioEnhanced?: (result: AudioEnhancementResult) => void;
  onNoiseProfileUpdate?: (profile: NoiseProfile) => void;
  onQualityChange?: (metrics: any) => void;
  onLatencyWarning?: (latency: number) => void;
}

export class AudioEnhancementEngine {
  private config: AudioEnhancementConfig;
  private callbacks: AudioCallbacks;
  
  // Audio processing components
  private audioContext: AudioContext | null = null;
  private processor: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  
  // Enhancement state
  private isInitialized = false;
  private isProcessing = false;
  private sampleRate = 16000;
  private frameSize = 1024;
  private hopSize = 512;
  
  // Noise reduction components
  private noiseProfile: NoiseProfile | null = null;
  private spectralSubtractor: SpectralSubtractor | null = null;
  private wienerFilter: WienerFilter | null = null;
  private adaptiveFilter: AdaptiveFilter | null = null;
  
  // Voice enhancement components
  private compressor: DynamicRangeCompressor | null = null;
  private equalizer: GraphicEqualizer | null = null;
  private preEmphasisFilter: PreEmphasisFilter | null = null;
  
  // Processing buffers
  private inputBuffer: Float32Array[] = [];
  private outputBuffer: Float32Array[] = [];
  private overlapBuffer: Float32Array = new Float32Array(0);
  
  // Performance monitoring
  private processingTimes: number[] = [];
  private qualityHistory: any[] = [];
  private latencyMeasurements: number[] = [];

  constructor(config: Partial<AudioEnhancementConfig> = {}, callbacks: AudioCallbacks = {}) {
    this.config = {
      enabled: true,
      noiseReduction: {
        enabled: true,
        algorithm: 'spectral_subtraction',
        aggressiveness: 0.7,
        preserveVoice: true,
        adaptiveThreshold: true
      },
      voiceEnhancement: {
        enabled: true,
        preEmphasis: 0.97,
        compression: {
          enabled: true,
          ratio: 4.0,
          threshold: -20, // dB
          attack: 10, // ms
          release: 100 // ms
        },
        equalization: {
          enabled: true,
          bands: [
            { frequency: 100, gain: -3, q: 0.7, type: 'highpass' },
            { frequency: 300, gain: 2, q: 1.0, type: 'peak' },
            { frequency: 1000, gain: 3, q: 0.8, type: 'peak' },
            { frequency: 3000, gain: 2, q: 0.8, type: 'peak' },
            { frequency: 8000, gain: -6, q: 0.7, type: 'lowpass' }
          ]
        },
        normalization: true
      },
      realTimeProcessing: true,
      latencyOptimized: true,
      qualityPreset: 'balanced',
      ...config
    };
    
    this.callbacks = callbacks;
    
    // Apply quality preset adjustments
    this.applyQualityPreset();
    
    console.log('🔊 Audio Enhancement Engine initialized');
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    console.log('🚀 Initializing Audio Enhancement Engine...');

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate,
        latencyHint: this.config.latencyOptimized ? 'interactive' : 'balanced'
      });

      // Initialize processing components
      await this.initializeProcessingComponents();
      
      // Initialize enhancement algorithms
      this.initializeEnhancementAlgorithms();
      
      // Setup audio worklet for real-time processing
      if (this.config.realTimeProcessing) {
        await this.setupAudioWorklet();
      }

      this.isInitialized = true;
      console.log('✅ Audio Enhancement Engine ready');
      
      return true;

    } catch (error) {
      console.error('❌ Audio Enhancement initialization failed:', error);
      return false;
    }
  }

  private applyQualityPreset(): void {
    switch (this.config.qualityPreset) {
      case 'ultra_low_latency':
        this.frameSize = 512;
        this.hopSize = 256;
        this.config.noiseReduction.aggressiveness = 0.5;
        this.config.latencyOptimized = true;
        break;
        
      case 'balanced':
        this.frameSize = 1024;
        this.hopSize = 512;
        this.config.noiseReduction.aggressiveness = 0.7;
        break;
        
      case 'high_quality':
        this.frameSize = 2048;
        this.hopSize = 1024;
        this.config.noiseReduction.aggressiveness = 0.9;
        this.config.latencyOptimized = false;
        break;
    }
  }

  private async initializeProcessingComponents(): Promise<void> {
    if (!this.audioContext) throw new Error('AudioContext not available');

    // Create analyser for spectrum analysis
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.frameSize * 2;
    this.analyser.smoothingTimeConstant = 0.1;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;

    // Initialize buffers
    this.overlapBuffer = new Float32Array(this.frameSize);
  }

  private initializeEnhancementAlgorithms(): void {
    // Initialize noise reduction algorithms
    this.spectralSubtractor = new SpectralSubtractor(this.frameSize, this.sampleRate);
    this.wienerFilter = new WienerFilter(this.frameSize, this.sampleRate);
    this.adaptiveFilter = new AdaptiveFilter(this.frameSize, this.sampleRate);
    
    // Initialize voice enhancement components
    this.compressor = new DynamicRangeCompressor(this.config.voiceEnhancement.compression);
    this.equalizer = new GraphicEqualizer(this.config.voiceEnhancement.equalization.bands, this.sampleRate);
    this.preEmphasisFilter = new PreEmphasisFilter(this.config.voiceEnhancement.preEmphasis);
  }

  private async setupAudioWorklet(): Promise<void> {
    if (!this.audioContext) return;

    try {
      await this.audioContext.audioWorklet.addModule('/audio-enhancement-worklet.js');
      
      this.processor = new AudioWorkletNode(this.audioContext, 'audio-enhancement-processor', {
        processorOptions: {
          frameSize: this.frameSize,
          hopSize: this.hopSize,
          sampleRate: this.sampleRate,
          config: this.config
        }
      });

      this.processor.port.onmessage = (event) => {
        this.handleWorkletMessage(event.data);
      };

    } catch (error) {
      console.warn('⚠️ AudioWorklet not available for enhancement, using fallback');
    }
  }

  async processAudio(audioData: Float32Array): Promise<AudioEnhancementResult> {
    if (!this.isInitialized) {
      throw new Error('Audio Enhancement Engine not initialized');
    }

    const startTime = performance.now();
    let enhancedAudio = new Float32Array(audioData);

    try {
      // Apply noise reduction
      if (this.config.noiseReduction.enabled) {
        enhancedAudio = await this.applyNoiseReduction(enhancedAudio);
      }

      // Apply voice enhancement
      if (this.config.voiceEnhancement.enabled) {
        enhancedAudio = await this.applyVoiceEnhancement(enhancedAudio);
      }

      // Calculate processing metrics
      const processingTime = performance.now() - startTime;
      const metrics = this.calculateProcessingMetrics(audioData, enhancedAudio, processingTime);
      const qualityMetrics = this.calculateQualityMetrics(audioData, enhancedAudio);

      // Update performance tracking
      this.updatePerformanceTracking(processingTime, qualityMetrics);

      const result: AudioEnhancementResult = {
        enhancedAudio,
        originalAudio: audioData,
        processingMetrics: metrics,
        qualityMetrics
      };

      // Trigger callbacks
      this.callbacks.onAudioEnhanced?.(result);

      return result;

    } catch (error) {
      console.error('❌ Audio enhancement error:', error);
      throw error;
    }
  }

  private async applyNoiseReduction(audioData: Float32Array): Promise<Float32Array> {
    switch (this.config.noiseReduction.algorithm) {
      case 'spectral_subtraction':
        return this.spectralSubtractor?.process(audioData, this.noiseProfile) || audioData;
        
      case 'wiener_filter':
        return this.wienerFilter?.process(audioData, this.noiseProfile) || audioData;
        
      case 'adaptive':
        return this.adaptiveFilter?.process(audioData) || audioData;
        
      case 'neural':
        // Neural noise reduction would require a trained model
        console.warn('Neural noise reduction not implemented, falling back to spectral subtraction');
        return this.spectralSubtractor?.process(audioData, this.noiseProfile) || audioData;
        
      default:
        return audioData;
    }
  }

  private async applyVoiceEnhancement(audioData: Float32Array): Promise<Float32Array> {
    let enhanced = new Float32Array(audioData);

    // Apply pre-emphasis
    if (this.preEmphasisFilter) {
      enhanced = this.preEmphasisFilter.process(enhanced);
    }

    // Apply equalization
    if (this.config.voiceEnhancement.equalization.enabled && this.equalizer) {
      enhanced = this.equalizer.process(enhanced);
    }

    // Apply dynamic range compression
    if (this.config.voiceEnhancement.compression.enabled && this.compressor) {
      enhanced = this.compressor.process(enhanced);
    }

    // Apply normalization
    if (this.config.voiceEnhancement.normalization) {
      enhanced = this.normalizeAudio(enhanced);
    }

    return enhanced;
  }

  updateNoiseProfile(audioData: Float32Array): void {
    const spectrum = this.computeSpectrum(audioData);
    const energy = this.calculateRMS(audioData);
    
    const profile: NoiseProfile = {
      spectrum,
      energy,
      characteristics: {
        isStationary: this.assessStationarity(spectrum),
        bandwidth: this.calculateBandwidth(spectrum),
        peakFrequency: this.findPeakFrequency(spectrum),
        spectralTilt: this.calculateSpectralTilt(spectrum)
      },
      timestamp: Date.now(),
      confidence: this.calculateProfileConfidence(audioData)
    };

    // Update with exponential smoothing if profile exists
    if (this.noiseProfile) {
      const alpha = 0.1; // Smoothing factor
      for (let i = 0; i < spectrum.length; i++) {
        this.noiseProfile.spectrum[i] = (1 - alpha) * this.noiseProfile.spectrum[i] + 
                                       alpha * spectrum[i];
      }
      this.noiseProfile.energy = (1 - alpha) * this.noiseProfile.energy + alpha * energy;
    } else {
      this.noiseProfile = profile;
    }

    this.callbacks.onNoiseProfileUpdate?.(this.noiseProfile);
  }

  private handleWorkletMessage(data: any): void {
    switch (data.type) {
      case 'enhanced_audio':
        // Handle real-time enhanced audio from worklet
        this.callbacks.onAudioEnhanced?.(data.result);
        break;
        
      case 'noise_profile':
        this.noiseProfile = data.profile;
        this.callbacks.onNoiseProfileUpdate?.(data.profile);
        break;
        
      case 'performance':
        this.updatePerformanceTracking(data.processingTime, data.qualityMetrics);
        break;
    }
  }

  private calculateProcessingMetrics(
    original: Float32Array, 
    enhanced: Float32Array, 
    processingTime: number
  ): AudioEnhancementResult['processingMetrics'] {
    const originalRMS = this.calculateRMS(original);
    const enhancedRMS = this.calculateRMS(enhanced);
    
    const noiseReductionDb = originalRMS > 0 ? 
      20 * Math.log10(originalRMS / (originalRMS - enhancedRMS + 0.001)) : 0;
    
    const signalEnhancement = enhancedRMS / originalRMS;
    
    const originalSpectrum = this.computeSpectrum(original);
    const enhancedSpectrum = this.computeSpectrum(enhanced);
    const spectralClarity = this.calculateSpectralClarity(originalSpectrum, enhancedSpectrum);
    
    const dynamicRange = this.calculateDynamicRange(enhanced);

    return {
      noiseReductionDb,
      signalEnhancement,
      spectralClarity,
      dynamicRange,
      processingLatency: processingTime
    };
  }

  private calculateQualityMetrics(
    original: Float32Array, 
    enhanced: Float32Array
  ): AudioEnhancementResult['qualityMetrics'] {
    const snr = this.calculateSNR(enhanced);
    const thd = this.calculateTHD(enhanced);
    const clarity = this.calculateClarity(original, enhanced);
    const naturalness = this.calculateNaturalness(enhanced);

    return { snr, thd, clarity, naturalness };
  }

  private updatePerformanceTracking(processingTime: number, qualityMetrics: any): void {
    this.processingTimes.push(processingTime);
    this.qualityHistory.push(qualityMetrics);
    
    // Maintain history size
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
      this.qualityHistory.shift();
    }

    // Check for latency warnings
    if (processingTime > 50) { // 50ms threshold
      this.callbacks.onLatencyWarning?.(processingTime);
    }

    // Trigger quality change callback
    const avgQuality = this.qualityHistory.slice(-10).reduce((sum, q) => 
      sum + q.clarity, 0) / Math.min(10, this.qualityHistory.length);
    
    this.callbacks.onQualityChange?.({ 
      avgProcessingTime: this.getAverageProcessingTime(),
      avgQuality,
      currentLatency: processingTime
    });
  }

  // Audio processing utility methods
  private computeSpectrum(audioData: Float32Array): Float32Array {
    // Apply window function
    const windowed = this.applyHammingWindow(audioData);
    
    // Compute FFT (simplified implementation)
    return this.computeFFT(windowed);
  }

  private applyHammingWindow(data: Float32Array): Float32Array {
    const windowed = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (data.length - 1));
      windowed[i] = data[i] * window;
    }
    return windowed;
  }

  private computeFFT(data: Float32Array): Float32Array {
    // Simplified FFT - in production use a proper FFT library
    const spectrum = new Float32Array(data.length / 2);
    
    for (let k = 0; k < spectrum.length; k++) {
      let real = 0, imag = 0;
      
      for (let n = 0; n < data.length; n++) {
        const angle = -2 * Math.PI * k * n / data.length;
        real += data[n] * Math.cos(angle);
        imag += data[n] * Math.sin(angle);
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return spectrum;
  }

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  private calculateSNR(data: Float32Array): number {
    const signal = this.calculateRMS(data);
    const noise = this.estimateNoiseLevel(data);
    return signal > 0 && noise > 0 ? 20 * Math.log10(signal / noise) : 0;
  }

  private calculateTHD(data: Float32Array): number {
    const spectrum = this.computeSpectrum(data);
    const fundamental = this.findFundamentalFrequency(spectrum);
    const harmonics = this.findHarmonics(spectrum, fundamental);
    
    const harmonicEnergy = harmonics.reduce((sum, h) => sum + h * h, 0);
    const totalEnergy = spectrum.reduce((sum, s) => sum + s * s, 0);
    
    return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0;
  }

  private calculateClarity(original: Float32Array, enhanced: Float32Array): number {
    const originalSpectrum = this.computeSpectrum(original);
    const enhancedSpectrum = this.computeSpectrum(enhanced);
    
    // Calculate spectral clarity improvement
    const originalClarity = this.calculateSpectralConcentration(originalSpectrum);
    const enhancedClarity = this.calculateSpectralConcentration(enhancedSpectrum);
    
    return enhancedClarity / originalClarity;
  }

  private calculateNaturalness(data: Float32Array): number {
    // Estimate naturalness based on spectral characteristics
    const spectrum = this.computeSpectrum(data);
    const spectralTilt = this.calculateSpectralTilt(spectrum);
    const harmonicity = this.calculateHarmonicity(spectrum);
    
    // Natural speech has moderate spectral tilt and harmonicity
    const tiltScore = 1 - Math.abs(spectralTilt - 0.7) / 0.7;
    const harmonicScore = harmonicity;
    
    return (tiltScore + harmonicScore) / 2;
  }

  private normalizeAudio(data: Float32Array): Float32Array {
    const peak = Math.max(...data.map(Math.abs));
    const targetPeak = 0.9; // Leave some headroom
    
    if (peak > 0) {
      const gain = targetPeak / peak;
      return data.map(sample => sample * gain);
    }
    
    return data;
  }

  // Additional utility methods
  private estimateNoiseLevel(data: Float32Array): number {
    // Use quieter portions of the signal to estimate noise
    const sorted = Array.from(data).map(Math.abs).sort((a, b) => a - b);
    const percentile10 = sorted[Math.floor(sorted.length * 0.1)];
    return percentile10;
  }

  private assessStationarity(spectrum: Float32Array): boolean {
    // Simple stationarity assessment based on spectral stability
    // In production, this would be more sophisticated
    return true; // Placeholder
  }

  private calculateBandwidth(spectrum: Float32Array): number {
    let totalEnergy = 0;
    let weightedSum = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const energy = spectrum[i] * spectrum[i];
      totalEnergy += energy;
      weightedSum += energy * i;
    }
    
    const centroid = totalEnergy > 0 ? weightedSum / totalEnergy : 0;
    
    // Calculate bandwidth as spread around centroid
    let bandwidth = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const energy = spectrum[i] * spectrum[i];
      bandwidth += energy * Math.pow(i - centroid, 2);
    }
    
    return totalEnergy > 0 ? Math.sqrt(bandwidth / totalEnergy) : 0;
  }

  private findPeakFrequency(spectrum: Float32Array): number {
    let maxIndex = 0;
    let maxValue = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      if (spectrum[i] > maxValue) {
        maxValue = spectrum[i];
        maxIndex = i;
      }
    }
    
    return maxIndex * this.sampleRate / (2 * spectrum.length);
  }

  private calculateSpectralTilt(spectrum: Float32Array): number {
    // Calculate tilt as ratio of high to low frequency energy
    const midpoint = spectrum.length / 2;
    let lowEnergy = 0, highEnergy = 0;
    
    for (let i = 0; i < midpoint; i++) {
      lowEnergy += spectrum[i] * spectrum[i];
    }
    
    for (let i = midpoint; i < spectrum.length; i++) {
      highEnergy += spectrum[i] * spectrum[i];
    }
    
    return lowEnergy > 0 ? highEnergy / lowEnergy : 0;
  }

  private calculateProfileConfidence(audioData: Float32Array): number {
    // Calculate confidence based on signal characteristics
    const energy = this.calculateRMS(audioData);
    const stability = this.calculateSpectralStability(audioData);
    
    return Math.min(1, energy * stability);
  }

  private calculateSpectralStability(audioData: Float32Array): number {
    // Measure how stable the spectrum is over time
    // Simplified implementation
    return 0.8; // Placeholder
  }

  private calculateSpectralClarity(original: Float32Array, enhanced: Float32Array): number {
    const originalConcentration = this.calculateSpectralConcentration(original);
    const enhancedConcentration = this.calculateSpectralConcentration(enhanced);
    
    return enhancedConcentration / originalConcentration;
  }

  private calculateSpectralConcentration(spectrum: Float32Array): number {
    const totalEnergy = spectrum.reduce((sum, s) => sum + s * s, 0);
    const maxEnergy = Math.max(...spectrum.map(s => s * s));
    
    return totalEnergy > 0 ? maxEnergy / totalEnergy : 0;
  }

  private calculateDynamicRange(data: Float32Array): number {
    const peak = Math.max(...data.map(Math.abs));
    const rms = this.calculateRMS(data);
    
    return peak > 0 && rms > 0 ? 20 * Math.log10(peak / rms) : 0;
  }

  private findFundamentalFrequency(spectrum: Float32Array): number {
    // Find the fundamental frequency in the spectrum
    let maxIndex = 0;
    let maxValue = 0;
    
    // Look in typical voice range (80-500 Hz)
    const startIndex = Math.floor(80 * spectrum.length / (this.sampleRate / 2));
    const endIndex = Math.floor(500 * spectrum.length / (this.sampleRate / 2));
    
    for (let i = startIndex; i < Math.min(endIndex, spectrum.length); i++) {
      if (spectrum[i] > maxValue) {
        maxValue = spectrum[i];
        maxIndex = i;
      }
    }
    
    return maxIndex * this.sampleRate / (2 * spectrum.length);
  }

  private findHarmonics(spectrum: Float32Array, fundamental: number): number[] {
    const harmonics: number[] = [];
    const fundamentalBin = Math.floor(fundamental * spectrum.length / (this.sampleRate / 2));
    
    // Find first few harmonics
    for (let harmonic = 2; harmonic <= 5; harmonic++) {
      const harmonicBin = fundamentalBin * harmonic;
      if (harmonicBin < spectrum.length) {
        harmonics.push(spectrum[harmonicBin]);
      }
    }
    
    return harmonics;
  }

  private calculateHarmonicity(spectrum: Float32Array): number {
    const fundamental = this.findFundamentalFrequency(spectrum);
    const harmonics = this.findHarmonics(spectrum, fundamental);
    
    const harmonicEnergy = harmonics.reduce((sum, h) => sum + h * h, 0);
    const totalEnergy = spectrum.reduce((sum, s) => sum + s * s, 0);
    
    return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0;
  }

  // Public API methods
  getAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) return 0;
    return this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
  }

  getCurrentNoiseProfile(): NoiseProfile | null {
    return this.noiseProfile;
  }

  updateConfig(newConfig: Partial<AudioEnhancementConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize components if needed
    if (this.isInitialized) {
      this.initializeEnhancementAlgorithms();
    }
    
    console.log('⚙️ Audio Enhancement config updated');
  }

  getQualityMetrics(): any {
    if (this.qualityHistory.length === 0) return null;
    
    const recent = this.qualityHistory.slice(-10);
    return {
      avgSNR: recent.reduce((sum, q) => sum + q.snr, 0) / recent.length,
      avgClarity: recent.reduce((sum, q) => sum + q.clarity, 0) / recent.length,
      avgNaturalness: recent.reduce((sum, q) => sum + q.naturalness, 0) / recent.length,
      avgTHD: recent.reduce((sum, q) => sum + q.thd, 0) / recent.length
    };
  }

  calibrateForEnvironment(audioSamples: Float32Array[]): void {
    console.log('🎛️ Calibrating enhancement for current environment...');
    
    // Analyze multiple audio samples to build environment profile
    for (const sample of audioSamples) {
      this.updateNoiseProfile(sample);
    }
    
    console.log('✅ Environment calibration complete');
  }

  destroy(): void {
    console.log('🛑 Destroying Audio Enhancement Engine...');
    
    this.isProcessing = false;
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isInitialized = false;
    
    console.log('✅ Audio Enhancement Engine destroyed');
  }
}

// Supporting classes for audio processing components
class SpectralSubtractor {
  constructor(private frameSize: number, private sampleRate: number) {}
  
  process(audioData: Float32Array, noiseProfile: NoiseProfile | null): Float32Array {
    // Simplified spectral subtraction implementation
    if (!noiseProfile) return audioData;
    
    // In production, this would perform proper spectral subtraction
    const enhanced = new Float32Array(audioData.length);
    const alpha = 2.0; // Over-subtraction factor
    const beta = 0.01; // Spectral floor
    
    for (let i = 0; i < audioData.length; i++) {
      const sample = audioData[i];
      const noiseEstimate = noiseProfile.energy * 0.1;
      const subtracted = Math.abs(sample) - alpha * noiseEstimate;
      enhanced[i] = Math.sign(sample) * Math.max(subtracted, beta * Math.abs(sample));
    }
    
    return enhanced;
  }
}

class WienerFilter {
  constructor(private frameSize: number, private sampleRate: number) {}
  
  process(audioData: Float32Array, noiseProfile: NoiseProfile | null): Float32Array {
    // Simplified Wiener filter implementation
    if (!noiseProfile) return audioData;
    
    // In production, this would implement proper Wiener filtering
    return audioData; // Placeholder
  }
}

class AdaptiveFilter {
  private weights: Float32Array;
  private delayLine: Float32Array;
  
  constructor(private frameSize: number, private sampleRate: number) {
    this.weights = new Float32Array(16); // 16-tap filter
    this.delayLine = new Float32Array(16);
  }
  
  process(audioData: Float32Array): Float32Array {
    const filtered = new Float32Array(audioData.length);
    const mu = 0.01; // Adaptation step size
    
    for (let i = 0; i < audioData.length; i++) {
      // Shift delay line
      for (let j = this.delayLine.length - 1; j > 0; j--) {
        this.delayLine[j] = this.delayLine[j - 1];
      }
      this.delayLine[0] = audioData[i];
      
      // Calculate filter output
      let output = 0;
      for (let j = 0; j < this.weights.length; j++) {
        output += this.weights[j] * this.delayLine[j];
      }
      
      // Error calculation and weight update
      const error = audioData[i] - output;
      for (let j = 0; j < this.weights.length; j++) {
        this.weights[j] += mu * error * this.delayLine[j];
      }
      
      filtered[i] = output;
    }
    
    return filtered;
  }
}

class DynamicRangeCompressor {
  private envelope = 0;
  
  constructor(private config: AudioEnhancementConfig['voiceEnhancement']['compression']) {}
  
  process(audioData: Float32Array): Float32Array {
    const compressed = new Float32Array(audioData.length);
    const threshold = Math.pow(10, this.config.threshold / 20); // Convert dB to linear
    const ratio = this.config.ratio;
    const attack = Math.exp(-1 / (this.config.attack * 0.001 * 16000)); // Convert ms to samples
    const release = Math.exp(-1 / (this.config.release * 0.001 * 16000));
    
    for (let i = 0; i < audioData.length; i++) {
      const input = Math.abs(audioData[i]);
      
      // Envelope follower
      if (input > this.envelope) {
        this.envelope = attack * this.envelope + (1 - attack) * input;
      } else {
        this.envelope = release * this.envelope + (1 - release) * input;
      }
      
      // Compression
      let gain = 1;
      if (this.envelope > threshold) {
        const excess = this.envelope - threshold;
        const compressedExcess = excess / ratio;
        gain = (threshold + compressedExcess) / this.envelope;
      }
      
      compressed[i] = audioData[i] * gain;
    }
    
    return compressed;
  }
}

class GraphicEqualizer {
  private filters: BiquadFilterNode[] = [];
  
  constructor(private bands: EqualizerBand[], private sampleRate: number) {
    // In a real implementation, this would create actual biquad filters
  }
  
  process(audioData: Float32Array): Float32Array {
    // Simplified EQ processing
    // In production, this would apply proper biquad filtering
    return audioData;
  }
}

class PreEmphasisFilter {
  private previousSample = 0;
  
  constructor(private coefficient: number) {}
  
  process(audioData: Float32Array): Float32Array {
    const filtered = new Float32Array(audioData.length);
    
    for (let i = 0; i < audioData.length; i++) {
      filtered[i] = audioData[i] - this.coefficient * this.previousSample;
      this.previousSample = audioData[i];
    }
    
    return filtered;
  }
}