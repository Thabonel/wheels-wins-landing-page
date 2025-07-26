/**
 * Advanced Voice Activity Detection (VAD)
 * Real-time speech detection with machine learning and spectral analysis
 * Inspired by WebRTC VAD and modern speech detection algorithms
 */

interface VADConfig {
  enabled: boolean;
  sensitivity: number; // 0.0 to 1.0
  algorithm: 'energy' | 'spectral' | 'ml' | 'hybrid';
  adaptiveThresholding: boolean;
  noiseReduction: boolean;
  frameSize: number;
  hopLength: number;
  preEmphasis: number;
  hangoverFrames: number; // Frames to continue after speech ends
  triggerFrames: number; // Frames needed to trigger speech start
}

interface VADResult {
  isSpeech: boolean;
  confidence: number;
  energy: number;
  spectralFeatures: SpectralFeatures;
  noiseLevel: number;
  snr: number; // Signal-to-noise ratio
  timestamp: number;
  frameIndex: number;
}

interface SpectralFeatures {
  spectralCentroid: number;
  spectralRolloff: number;
  spectralFlux: number;
  mfcc: number[];
  zcr: number; // Zero crossing rate
  bandwidth: number;
  harmonicity: number;
}

interface VADCallbacks {
  onSpeechStart?: (result: VADResult) => void;
  onSpeechEnd?: (result: VADResult) => void;
  onSpeechActivity?: (result: VADResult) => void;
  onNoiseUpdate?: (noiseLevel: number) => void;
  onSensitivityChange?: (sensitivity: number) => void;
}

interface AdaptiveThresholds {
  energyThreshold: number;
  spectralThreshold: number;
  confidenceThreshold: number;
  noiseFloor: number;
  adaptationRate: number;
}

export class AdvancedVAD {
  private config: VADConfig;
  private callbacks: VADCallbacks;
  
  // Audio processing
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: AudioWorkletNode | null = null;
  
  // VAD state
  private isInitialized = false;
  private isSpeechActive = false;
  private frameCounter = 0;
  private speechFrameCount = 0;
  private silenceFrameCount = 0;
  
  // Adaptive thresholding
  private thresholds: AdaptiveThresholds = {
    energyThreshold: 0.01,
    spectralThreshold: 0.5,
    confidenceThreshold: 0.6,
    noiseFloor: 0.001,
    adaptationRate: 0.1
  };
  
  // Signal processing buffers
  private energyHistory: number[] = [];
  private spectralHistory: SpectralFeatures[] = [];
  private noiseEstimate = 0.001;
  private signalEstimate = 0.1;
  
  // Frequency domain processing
  private fftSize = 1024;
  private frequencyData = new Uint8Array(this.fftSize / 2);
  private timeData = new Uint8Array(this.fftSize);
  private previousSpectrum = new Float32Array(this.fftSize / 2);
  
  // Machine learning features (simplified)
  private featureBuffer: number[][] = [];
  private mlWeights: number[] = [];
  private mlBias = 0;
  
  // Performance tracking
  private processingTimes: number[] = [];
  private vadHistory: VADResult[] = [];

  constructor(config: Partial<VADConfig> = {}, callbacks: VADCallbacks = {}) {
    this.config = {
      enabled: true,
      sensitivity: 0.7,
      algorithm: 'hybrid',
      adaptiveThresholding: true,
      noiseReduction: true,
      frameSize: 1024,
      hopLength: 512,
      preEmphasis: 0.97,
      hangoverFrames: 10,
      triggerFrames: 3,
      ...config
    };
    
    this.callbacks = callbacks;
    
    // Initialize ML weights (simplified linear model)
    this.initializeMLModel();
    
    console.log('🎯 Advanced VAD initialized');
  }

  async initialize(audioContext?: AudioContext): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    console.log('🚀 Initializing Advanced VAD...');

    try {
      this.audioContext = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: 'interactive'
      });

      // Create analyser for frequency domain analysis
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.1;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // Try to initialize AudioWorklet for advanced processing
      try {
        await this.audioContext.audioWorklet.addModule('/vad-processor-worklet.js');
        this.processor = new AudioWorkletNode(this.audioContext, 'vad-processor', {
          processorOptions: {
            frameSize: this.config.frameSize,
            hopLength: this.config.hopLength,
            preEmphasis: this.config.preEmphasis
          }
        });

        this.processor.port.onmessage = (event) => {
          this.handleWorkletMessage(event.data);
        };

      } catch (error) {
        console.warn('⚠️ VAD AudioWorklet not available, using fallback');
      }

      // Establish baseline noise level
      await this.calibrateNoiseFloor();

      this.isInitialized = true;
      console.log('✅ Advanced VAD ready');
      
      return true;

    } catch (error) {
      console.error('❌ VAD initialization failed:', error);
      return false;
    }
  }

  connectAudioSource(source: AudioNode): void {
    if (!this.analyser) {
      throw new Error('VAD not initialized');
    }

    source.connect(this.analyser);
    
    if (this.processor) {
      this.analyser.connect(this.processor);
    }

    // Start processing
    this.startProcessing();
  }

  private async calibrateNoiseFloor(): Promise<void> {
    console.log('🎛️ Calibrating noise floor...');
    
    const calibrationTime = 2000; // 2 seconds
    const samples: number[] = [];
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
        let rms = 0;
        for (let i = 0; i < this.timeData.length; i++) {
          const normalized = (this.timeData[i] - 128) / 128;
          rms += normalized * normalized;
        }
        rms = Math.sqrt(rms / this.timeData.length);
        samples.push(rms);
        
        if (Date.now() - startTime >= calibrationTime) {
          clearInterval(calibrationInterval);
          
          // Calculate noise floor as median of samples
          samples.sort((a, b) => a - b);
          this.noiseEstimate = samples[Math.floor(samples.length * 0.5)] || 0.001;
          this.thresholds.noiseFloor = this.noiseEstimate;
          
          console.log(`🎛️ Noise floor: ${this.noiseEstimate.toFixed(4)}`);
          this.callbacks.onNoiseUpdate?.(this.noiseEstimate);
          resolve();
        }
      }, 50);
    });
  }

  private startProcessing(): void {
    if (!this.isInitialized) return;

    const processFrame = () => {
      if (!this.analyser) return;

      const startTime = performance.now();
      
      // Get audio data
      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeData);
      
      // Process frame
      const vadResult = this.processAudioFrame();
      
      // Track performance
      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics(processingTime);
      
      // Continue processing
      if (this.config.enabled) {
        requestAnimationFrame(processFrame);
      }
    };

    processFrame();
  }

  private processAudioFrame(): VADResult {
    const timestamp = performance.now();
    
    // Convert time domain data to Float32Array
    const audioData = new Float32Array(this.timeData.length);
    for (let i = 0; i < this.timeData.length; i++) {
      audioData[i] = (this.timeData[i] - 128) / 128;
    }
    
    // Apply pre-emphasis filter
    if (this.config.preEmphasis > 0) {
      this.applyPreEmphasis(audioData);
    }
    
    // Calculate energy
    const energy = this.calculateEnergy(audioData);
    
    // Extract spectral features
    const spectralFeatures = this.extractSpectralFeatures(audioData);
    
    // Calculate SNR
    const snr = this.calculateSNR(energy);
    
    // Run VAD algorithm
    const vadDecision = this.runVADAlgorithm(energy, spectralFeatures, snr);
    
    // Apply temporal smoothing
    const smoothedDecision = this.applyTemporalSmoothing(vadDecision);
    
    // Create result
    const result: VADResult = {
      isSpeech: smoothedDecision.isSpeech,
      confidence: smoothedDecision.confidence,
      energy: energy,
      spectralFeatures: spectralFeatures,
      noiseLevel: this.noiseEstimate,
      snr: snr,
      timestamp: timestamp,
      frameIndex: this.frameCounter++
    };
    
    // Update adaptive thresholds
    if (this.config.adaptiveThresholding) {
      this.updateAdaptiveThresholds(result);
    }
    
    // Handle speech state changes
    this.handleSpeechStateChange(result);
    
    // Store history
    this.vadHistory.push(result);
    if (this.vadHistory.length > 100) {
      this.vadHistory.shift();
    }
    
    // Trigger callbacks
    this.callbacks.onSpeechActivity?.(result);
    
    return result;
  }

  private applyPreEmphasis(data: Float32Array): void {
    for (let i = data.length - 1; i > 0; i--) {
      data[i] = data[i] - this.config.preEmphasis * data[i - 1];
    }
  }

  private calculateEnergy(data: Float32Array): number {
    let energy = 0;
    for (let i = 0; i < data.length; i++) {
      energy += data[i] * data[i];
    }
    return Math.sqrt(energy / data.length);
  }

  private extractSpectralFeatures(data: Float32Array): SpectralFeatures {
    // Convert to frequency domain (simplified FFT)
    const spectrum = this.simpleFFT(data);
    
    // Calculate spectral centroid
    const spectralCentroid = this.calculateSpectralCentroid(spectrum);
    
    // Calculate spectral rolloff
    const spectralRolloff = this.calculateSpectralRolloff(spectrum);
    
    // Calculate spectral flux
    const spectralFlux = this.calculateSpectralFlux(spectrum);
    
    // Calculate zero crossing rate
    const zcr = this.calculateZeroCrossingRate(data);
    
    // Calculate bandwidth
    const bandwidth = this.calculateSpectralBandwidth(spectrum, spectralCentroid);
    
    // Calculate harmonicity
    const harmonicity = this.calculateHarmonicity(spectrum);
    
    // Calculate MFCC (simplified)
    const mfcc = this.calculateMFCC(spectrum);
    
    // Store previous spectrum for flux calculation
    this.previousSpectrum.set(spectrum);
    
    return {
      spectralCentroid,
      spectralRolloff,
      spectralFlux,
      mfcc,
      zcr,
      bandwidth,
      harmonicity
    };
  }

  private simpleFFT(data: Float32Array): Float32Array {
    // Simplified FFT - in production, use a proper FFT library
    const result = new Float32Array(data.length / 2);
    
    for (let k = 0; k < result.length; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < data.length; n++) {
        const angle = -2 * Math.PI * k * n / data.length;
        real += data[n] * Math.cos(angle);
        imag += data[n] * Math.sin(angle);
      }
      result[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return result;
  }

  private calculateSpectralCentroid(spectrum: Float32Array): number {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = i * 8000 / spectrum.length; // Assume 16kHz sample rate
      weightedSum += frequency * spectrum[i];
      magnitudeSum += spectrum[i];
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateSpectralRolloff(spectrum: Float32Array): number {
    const totalEnergy = spectrum.reduce((sum, val) => sum + val * val, 0);
    const threshold = totalEnergy * 0.85;
    
    let cumulativeEnergy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      cumulativeEnergy += spectrum[i] * spectrum[i];
      if (cumulativeEnergy >= threshold) {
        return i * 8000 / spectrum.length;
      }
    }
    
    return 8000; // Nyquist frequency
  }

  private calculateSpectralFlux(spectrum: Float32Array): number {
    if (this.previousSpectrum.length !== spectrum.length) {
      return 0;
    }
    
    let flux = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const diff = spectrum[i] - this.previousSpectrum[i];
      flux += diff * diff;
    }
    
    return Math.sqrt(flux / spectrum.length);
  }

  private calculateZeroCrossingRate(data: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0) !== (data[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / (data.length - 1);
  }

  private calculateSpectralBandwidth(spectrum: Float32Array, centroid: number): number {
    let weightedVariance = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = i * 8000 / spectrum.length;
      const diff = frequency - centroid;
      weightedVariance += diff * diff * spectrum[i];
      magnitudeSum += spectrum[i];
    }
    
    return magnitudeSum > 0 ? Math.sqrt(weightedVariance / magnitudeSum) : 0;
  }

  private calculateHarmonicity(spectrum: Float32Array): number {
    // Simplified harmonicity calculation
    let harmonicEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const energy = spectrum[i] * spectrum[i];
      totalEnergy += energy;
      
      // Check if frequency is harmonic (simplified)
      const frequency = i * 8000 / spectrum.length;
      if (frequency > 80 && frequency < 400) { // Fundamental frequency range
        harmonicEnergy += energy;
      }
    }
    
    return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0;
  }

  private calculateMFCC(spectrum: Float32Array): number[] {
    // Simplified MFCC calculation (mel-frequency cepstral coefficients)
    const numCoeffs = 13;
    const mfcc = new Array(numCoeffs).fill(0);
    
    // Apply mel filter bank (simplified)
    const melFilters = this.createMelFilterBank(spectrum.length, 16000);
    
    for (let i = 0; i < numCoeffs; i++) {
      let sum = 0;
      for (let j = 0; j < spectrum.length; j++) {
        if (i < melFilters.length) {
          sum += spectrum[j] * melFilters[i][j];
        }
      }
      mfcc[i] = Math.log(sum + 0.001); // Add small epsilon to avoid log(0)
    }
    
    return mfcc;
  }

  private createMelFilterBank(spectrumLength: number, sampleRate: number): number[][] {
    // Simplified mel filter bank creation
    const numFilters = 13;
    const filters: number[][] = [];
    
    for (let i = 0; i < numFilters; i++) {
      const filter = new Array(spectrumLength).fill(0);
      
      // Create triangular filter
      const centerFreq = (i + 1) * sampleRate / (2 * numFilters);
      const centerBin = Math.floor(centerFreq * spectrumLength / (sampleRate / 2));
      const width = Math.floor(spectrumLength / numFilters);
      
      for (let j = Math.max(0, centerBin - width); j < Math.min(spectrumLength, centerBin + width); j++) {
        const distance = Math.abs(j - centerBin);
        filter[j] = Math.max(0, 1 - distance / width);
      }
      
      filters.push(filter);
    }
    
    return filters;
  }

  private calculateSNR(energy: number): number {
    return Math.max(0, 20 * Math.log10(energy / (this.noiseEstimate + 0.001)));
  }

  private runVADAlgorithm(energy: number, features: SpectralFeatures, snr: number): { isSpeech: boolean; confidence: number } {
    switch (this.config.algorithm) {
      case 'energy':
        return this.energyBasedVAD(energy);
      case 'spectral':
        return this.spectralBasedVAD(features);
      case 'ml':
        return this.mlBasedVAD(energy, features, snr);
      case 'hybrid':
      default:
        return this.hybridVAD(energy, features, snr);
    }
  }

  private energyBasedVAD(energy: number): { isSpeech: boolean; confidence: number } {
    const threshold = this.thresholds.energyThreshold;
    const confidence = Math.min(1, energy / threshold);
    return {
      isSpeech: energy > threshold,
      confidence: confidence
    };
  }

  private spectralBasedVAD(features: SpectralFeatures): { isSpeech: boolean; confidence: number } {
    // Speech typically has:
    // - Spectral centroid in speech range (500-2000 Hz)
    // - Moderate ZCR (0.1-0.5)
    // - Harmonic structure
    
    const centroidScore = features.spectralCentroid > 500 && features.spectralCentroid < 2000 ? 1 : 0;
    const zcrScore = features.zcr > 0.1 && features.zcr < 0.5 ? 1 : 0;
    const harmonicityScore = features.harmonicity;
    
    const confidence = (centroidScore + zcrScore + harmonicityScore) / 3;
    
    return {
      isSpeech: confidence > this.thresholds.spectralThreshold,
      confidence: confidence
    };
  }

  private mlBasedVAD(energy: number, features: SpectralFeatures, snr: number): { isSpeech: boolean; confidence: number } {
    // Simple linear classifier
    const featureVector = [
      energy,
      features.spectralCentroid / 1000,
      features.zcr,
      features.harmonicity,
      snr / 20,
      features.spectralFlux
    ];
    
    let score = this.mlBias;
    for (let i = 0; i < Math.min(featureVector.length, this.mlWeights.length); i++) {
      score += featureVector[i] * this.mlWeights[i];
    }
    
    const confidence = 1 / (1 + Math.exp(-score)); // Sigmoid activation
    
    return {
      isSpeech: confidence > this.thresholds.confidenceThreshold,
      confidence: confidence
    };
  }

  private hybridVAD(energy: number, features: SpectralFeatures, snr: number): { isSpeech: boolean; confidence: number } {
    const energyResult = this.energyBasedVAD(energy);
    const spectralResult = this.spectralBasedVAD(features);
    const mlResult = this.mlBasedVAD(energy, features, snr);
    
    // Weighted combination
    const combinedConfidence = (
      energyResult.confidence * 0.3 +
      spectralResult.confidence * 0.3 +
      mlResult.confidence * 0.4
    );
    
    return {
      isSpeech: combinedConfidence > this.thresholds.confidenceThreshold,
      confidence: combinedConfidence
    };
  }

  private applyTemporalSmoothing(decision: { isSpeech: boolean; confidence: number }): { isSpeech: boolean; confidence: number } {
    if (decision.isSpeech) {
      this.speechFrameCount++;
      this.silenceFrameCount = 0;
    } else {
      this.speechFrameCount = 0;
      this.silenceFrameCount++;
    }
    
    // Apply hangover and trigger logic
    let finalDecision = decision.isSpeech;
    
    if (!this.isSpeechActive && this.speechFrameCount >= this.config.triggerFrames) {
      finalDecision = true;
    } else if (this.isSpeechActive && this.silenceFrameCount >= this.config.hangoverFrames) {
      finalDecision = false;
    } else if (this.isSpeechActive) {
      finalDecision = true; // Continue speech during hangover
    }
    
    return {
      isSpeech: finalDecision,
      confidence: decision.confidence
    };
  }

  private updateAdaptiveThresholds(result: VADResult): void {
    const adaptationRate = this.thresholds.adaptationRate;
    
    // Update noise estimate during silence
    if (!result.isSpeech) {
      this.noiseEstimate = (1 - adaptationRate) * this.noiseEstimate + adaptationRate * result.energy;
      this.thresholds.noiseFloor = this.noiseEstimate;
    }
    
    // Update energy threshold based on SNR
    if (result.snr > 10) { // High SNR indicates clean speech
      const targetThreshold = this.noiseEstimate * 3;
      this.thresholds.energyThreshold = (1 - adaptationRate) * this.thresholds.energyThreshold + adaptationRate * targetThreshold;
    }
    
    // Adapt based on user sensitivity setting
    const sensitivityFactor = this.config.sensitivity;
    this.thresholds.confidenceThreshold = 0.4 + (1 - sensitivityFactor) * 0.4; // Range: 0.4 to 0.8
  }

  private handleSpeechStateChange(result: VADResult): void {
    const wasActive = this.isSpeechActive;
    this.isSpeechActive = result.isSpeech;
    
    if (!wasActive && this.isSpeechActive) {
      // Speech started
      console.log('🗣️ Speech started');
      this.callbacks.onSpeechStart?.(result);
    } else if (wasActive && !this.isSpeechActive) {
      // Speech ended
      console.log('🤫 Speech ended');
      this.callbacks.onSpeechEnd?.(result);
    }
  }

  private handleWorkletMessage(data: any): void {
    if (data.type === 'vad-result') {
      // Process result from AudioWorklet
      this.handleSpeechStateChange(data.result);
    }
  }

  private initializeMLModel(): void {
    // Initialize simple linear model weights for VAD
    this.mlWeights = [
      2.5,  // energy weight
      1.0,  // spectral centroid weight  
      -1.5, // ZCR weight (negative because speech has moderate ZCR)
      2.0,  // harmonicity weight
      0.5,  // SNR weight
      0.8   // spectral flux weight
    ];
    this.mlBias = -1.0;
  }

  private updatePerformanceMetrics(processingTime: number): void {
    this.processingTimes.push(processingTime);
    
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
  }

  // Public API methods
  isSpeechDetected(): boolean {
    return this.isSpeechActive;
  }

  getConfidence(): number {
    const recent = this.vadHistory.slice(-1)[0];
    return recent?.confidence || 0;
  }

  getCurrentSNR(): number {
    const recent = this.vadHistory.slice(-1)[0];
    return recent?.snr || 0;
  }

  getNoiseLevel(): number {
    return this.noiseEstimate;
  }

  updateSensitivity(sensitivity: number): void {
    this.config.sensitivity = Math.max(0, Math.min(1, sensitivity));
    this.callbacks.onSensitivityChange?.(this.config.sensitivity);
    console.log(`🎯 VAD sensitivity updated to ${this.config.sensitivity.toFixed(2)}`);
  }

  getVADHistory(limit: number = 10): VADResult[] {
    return this.vadHistory.slice(-limit);
  }

  getPerformanceMetrics(): any {
    if (this.processingTimes.length === 0) return null;
    
    const avg = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    const max = Math.max(...this.processingTimes);
    const min = Math.min(...this.processingTimes);
    
    return {
      avgProcessingTime: avg,
      maxProcessingTime: max,
      minProcessingTime: min,
      totalFrames: this.frameCounter,
      speechFrames: this.vadHistory.filter(r => r.isSpeech).length,
      accuracy: this.vadHistory.length > 0 ? this.vadHistory.filter(r => r.confidence > 0.8).length / this.vadHistory.length : 0
    };
  }

  updateConfig(newConfig: Partial<VADConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ VAD config updated');
  }

  destroy(): void {
    console.log('🛑 Destroying Advanced VAD...');
    
    this.config.enabled = false;
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    this.isInitialized = false;
    
    console.log('✅ Advanced VAD destroyed');
  }
}