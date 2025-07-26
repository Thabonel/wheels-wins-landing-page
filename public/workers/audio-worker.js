/**
 * Audio Processing Worker
 * Handles audio analysis, enhancement, and real-time processing
 * Optimized for low-latency audio operations
 */

class AudioProcessor {
  constructor() {
    this.isInitialized = false;
    this.sampleRate = 16000;
    this.fftSize = 1024;
    this.windowSize = 1024;
    this.hopSize = 512;
    
    // Audio analysis state
    this.noiseProfile = null;
    this.spectralSubtraction = null;
    this.adaptiveFilter = null;
    
    // Performance tracking
    this.tasksProcessed = 0;
    this.totalProcessingTime = 0;
    this.memoryUsage = 0;
    
    console.log('🎵 Audio Worker initialized');
  }
  
  async initialize(config) {
    try {
      this.sampleRate = config.sampleRate || 16000;
      this.fftSize = config.fftSize || 1024;
      
      // Initialize audio processing modules
      this.initializeNoiseReduction();
      this.initializeSpectralAnalysis();
      this.initializeVoiceEnhancement();
      
      this.isInitialized = true;
      return { success: true };
      
    } catch (error) {
      console.error('Audio worker initialization failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  initializeNoiseReduction() {
    // Initialize spectral subtraction for noise reduction
    this.spectralSubtraction = {
      alpha: 2.0,        // Over-subtraction factor
      beta: 0.01,        // Spectral floor
      noiseSpectrum: new Float32Array(this.fftSize / 2),
      smoothingFactor: 0.9
    };
  }
  
  initializeSpectralAnalysis() {
    // Initialize spectral analysis tools
    this.spectralAnalysis = {
      hammingWindow: this.createHammingWindow(this.windowSize),
      previousSpectrum: new Float32Array(this.fftSize / 2),
      spectralFlux: 0,
      spectralCentroid: 0,
      spectralRolloff: 0
    };
  }
  
  initializeVoiceEnhancement() {
    // Initialize voice enhancement algorithms
    this.voiceEnhancement = {
      preEmphasisCoeff: 0.97,
      compressionRatio: 4.0,
      compressionThreshold: 0.7,
      limiterThreshold: 0.95
    };
  }
  
  async processTask(task) {
    const startTime = performance.now();
    
    try {
      let result;
      
      switch (task.type) {
        case 'audio_analysis':
          result = await this.analyzeAudio(task.data);
          break;
          
        case 'noise_reduction':
          result = await this.reduceNoise(task.data);
          break;
          
        case 'voice_enhancement':
          result = await this.enhanceVoice(task.data);
          break;
          
        case 'spectral_analysis':
          result = await this.performSpectralAnalysis(task.data);
          break;
          
        case 'wake_word_detection':
          result = await this.detectWakeWord(task.data);
          break;
          
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
      
      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime);
      
      return {
        success: true,
        result: result,
        processingTime: processingTime,
        memoryUsage: this.estimateMemoryUsage()
      };
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      console.error('Audio processing error:', error);
      
      return {
        success: false,
        error: error.message,
        processingTime: processingTime
      };
    }
  }
  
  async analyzeAudio(audioData) {
    const { samples, sampleRate } = audioData;
    const floatSamples = new Float32Array(samples);
    
    // Calculate basic audio features
    const features = {
      rms: this.calculateRMS(floatSamples),
      peak: this.calculatePeak(floatSamples),
      zcr: this.calculateZeroCrossingRate(floatSamples),
      spectralFeatures: this.extractSpectralFeatures(floatSamples),
      temporalFeatures: this.extractTemporalFeatures(floatSamples),
      voiceActivity: this.detectVoiceActivity(floatSamples)
    };
    
    return {
      type: 'audio_analysis',
      features: features,
      timestamp: Date.now(),
      sampleRate: sampleRate
    };
  }
  
  async reduceNoise(audioData) {
    const { samples, sampleRate, noiseProfile } = audioData;
    const floatSamples = new Float32Array(samples);
    
    // Update noise profile if provided
    if (noiseProfile) {
      this.updateNoiseProfile(noiseProfile);
    }
    
    // Apply spectral subtraction
    const enhancedSamples = this.applySpectralSubtraction(floatSamples);
    
    // Apply adaptive filtering
    const filteredSamples = this.applyAdaptiveFilter(enhancedSamples);
    
    return {
      type: 'noise_reduction',
      enhancedSamples: Array.from(filteredSamples),
      noiseReductionLevel: this.calculateNoiseReduction(floatSamples, filteredSamples),
      sampleRate: sampleRate
    };
  }
  
  async enhanceVoice(audioData) {
    const { samples, sampleRate } = audioData;
    let floatSamples = new Float32Array(samples);
    
    // Apply pre-emphasis
    floatSamples = this.applyPreEmphasis(floatSamples);
    
    // Apply dynamic range compression
    floatSamples = this.applyCompression(floatSamples);
    
    // Apply spectral enhancement
    floatSamples = this.applySpectralEnhancement(floatSamples);
    
    // Apply limiting to prevent clipping
    floatSamples = this.applyLimiter(floatSamples);
    
    return {
      type: 'voice_enhancement',
      enhancedSamples: Array.from(floatSamples),
      enhancementMetrics: this.calculateEnhancementMetrics(samples, floatSamples),
      sampleRate: sampleRate
    };
  }
  
  async performSpectralAnalysis(audioData) {
    const { samples, sampleRate } = audioData;
    const floatSamples = new Float32Array(samples);
    
    // Apply window function
    const windowedSamples = this.applyWindow(floatSamples, this.spectralAnalysis.hammingWindow);
    
    // Compute FFT
    const spectrum = this.computeFFT(windowedSamples);
    
    // Extract spectral features
    const spectralFeatures = {
      spectrum: Array.from(spectrum),
      spectralCentroid: this.calculateSpectralCentroid(spectrum),
      spectralRolloff: this.calculateSpectralRolloff(spectrum),
      spectralFlux: this.calculateSpectralFlux(spectrum),
      spectralBandwidth: this.calculateSpectralBandwidth(spectrum),
      mfcc: this.calculateMFCC(spectrum),
      chromaVector: this.calculateChromaVector(spectrum)
    };
    
    // Update previous spectrum for flux calculation
    this.spectralAnalysis.previousSpectrum.set(spectrum);
    
    return {
      type: 'spectral_analysis',
      features: spectralFeatures,
      sampleRate: sampleRate,
      fftSize: this.fftSize
    };
  }
  
  async detectWakeWord(audioData) {
    const { samples, sampleRate, keywords } = audioData;
    const floatSamples = new Float32Array(samples);
    
    // Extract features for wake word detection
    const features = this.extractWakeWordFeatures(floatSamples);
    
    // Match against keyword patterns
    const detectionResults = [];
    
    for (const keyword of keywords || ['hey pam', 'pam']) {
      const confidence = this.matchKeywordPattern(features, keyword);
      
      detectionResults.push({
        keyword: keyword,
        confidence: confidence,
        detected: confidence > 0.7
      });
    }
    
    return {
      type: 'wake_word_detection',
      results: detectionResults,
      bestMatch: detectionResults.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      ),
      features: features
    };
  }
  
  // Audio processing helper methods
  calculateRMS(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }
  
  calculatePeak(samples) {
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > peak) peak = abs;
    }
    return peak;
  }
  
  calculateZeroCrossingRate(samples) {
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / (samples.length - 1);
  }
  
  extractSpectralFeatures(samples) {
    const spectrum = this.computeFFT(samples);
    
    return {
      spectralCentroid: this.calculateSpectralCentroid(spectrum),
      spectralRolloff: this.calculateSpectralRolloff(spectrum),
      spectralFlux: this.calculateSpectralFlux(spectrum),
      harmonicity: this.calculateHarmonicity(spectrum)
    };
  }
  
  extractTemporalFeatures(samples) {
    return {
      tempo: this.estimateTempo(samples),
      rhythm: this.analyzeRhythm(samples),
      pitch: this.estimatePitch(samples)
    };
  }
  
  detectVoiceActivity(samples) {
    const energy = this.calculateRMS(samples);
    const zcr = this.calculateZeroCrossingRate(samples);
    const spectralFeatures = this.extractSpectralFeatures(samples);
    
    // Simple VAD decision
    const energyScore = energy > 0.01 ? 1 : 0;
    const zcrScore = (zcr > 0.1 && zcr < 0.5) ? 1 : 0;
    const spectralScore = (spectralFeatures.spectralCentroid > 300 && 
                          spectralFeatures.spectralCentroid < 3000) ? 1 : 0;
    
    const confidence = (energyScore + zcrScore + spectralScore) / 3;
    
    return {
      isVoice: confidence > 0.6,
      confidence: confidence,
      energy: energy,
      zcr: zcr
    };
  }
  
  applySpectralSubtraction(samples) {
    const spectrum = this.computeFFT(samples);
    const enhancedSpectrum = new Float32Array(spectrum.length);
    
    for (let i = 0; i < spectrum.length; i++) {
      const noiseLevel = this.spectralSubtraction.noiseSpectrum[i] || 0.01;
      const subtracted = spectrum[i] - this.spectralSubtraction.alpha * noiseLevel;
      enhancedSpectrum[i] = Math.max(
        subtracted,
        this.spectralSubtraction.beta * spectrum[i]
      );
    }
    
    return this.computeIFFT(enhancedSpectrum);
  }
  
  applyAdaptiveFilter(samples) {
    // Simple adaptive filter implementation
    const filtered = new Float32Array(samples.length);
    const filterOrder = 8;
    const mu = 0.01; // Adaptation step size
    
    const weights = new Float32Array(filterOrder);
    const delayLine = new Float32Array(filterOrder);
    
    for (let i = 0; i < samples.length; i++) {
      // Shift delay line
      for (let j = filterOrder - 1; j > 0; j--) {
        delayLine[j] = delayLine[j - 1];
      }
      delayLine[0] = samples[i];
      
      // Calculate filter output
      let output = 0;
      for (let j = 0; j < filterOrder; j++) {
        output += weights[j] * delayLine[j];
      }
      
      // Error calculation and weight update
      const error = samples[i] - output;
      for (let j = 0; j < filterOrder; j++) {
        weights[j] += mu * error * delayLine[j];
      }
      
      filtered[i] = output;
    }
    
    return filtered;
  }
  
  applyPreEmphasis(samples) {
    const emphasized = new Float32Array(samples.length);
    emphasized[0] = samples[0];
    
    for (let i = 1; i < samples.length; i++) {
      emphasized[i] = samples[i] - this.voiceEnhancement.preEmphasisCoeff * samples[i - 1];
    }
    
    return emphasized;
  }
  
  applyCompression(samples) {
    const compressed = new Float32Array(samples.length);
    const threshold = this.voiceEnhancement.compressionThreshold;
    const ratio = this.voiceEnhancement.compressionRatio;
    
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      
      if (abs > threshold) {
        const excess = abs - threshold;
        const compressedExcess = excess / ratio;
        const compressedAbs = threshold + compressedExcess;
        
        compressed[i] = samples[i] < 0 ? -compressedAbs : compressedAbs;
      } else {
        compressed[i] = samples[i];
      }
    }
    
    return compressed;
  }
  
  applySpectralEnhancement(samples) {
    // Apply spectral enhancement (simplified)
    const spectrum = this.computeFFT(samples);
    
    // Enhance speech frequencies (300-3400 Hz)
    const nyquist = this.sampleRate / 2;
    
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = (i / spectrum.length) * nyquist;
      
      if (frequency >= 300 && frequency <= 3400) {
        spectrum[i] *= 1.2; // Boost speech frequencies
      } else if (frequency < 100 || frequency > 8000) {
        spectrum[i] *= 0.8; // Attenuate noise frequencies
      }
    }
    
    return this.computeIFFT(spectrum);
  }
  
  applyLimiter(samples) {
    const limited = new Float32Array(samples.length);
    const threshold = this.voiceEnhancement.limiterThreshold;
    
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) > threshold) {
        limited[i] = samples[i] < 0 ? -threshold : threshold;
      } else {
        limited[i] = samples[i];
      }
    }
    
    return limited;
  }
  
  // FFT/IFFT implementations (simplified)
  computeFFT(samples) {
    // Simplified FFT - in production, use a proper FFT library
    const N = samples.length;
    const spectrum = new Float32Array(N / 2);
    
    for (let k = 0; k < spectrum.length; k++) {
      let real = 0, imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += samples[n] * Math.cos(angle);
        imag += samples[n] * Math.sin(angle);
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return spectrum;
  }
  
  computeIFFT(spectrum) {
    // Simplified IFFT - in production, use a proper FFT library
    const N = spectrum.length * 2;
    const samples = new Float32Array(N);
    
    for (let n = 0; n < N; n++) {
      let sum = 0;
      
      for (let k = 0; k < spectrum.length; k++) {
        const angle = 2 * Math.PI * k * n / N;
        sum += spectrum[k] * Math.cos(angle);
      }
      
      samples[n] = sum / N;
    }
    
    return samples;
  }
  
  // Utility methods
  createHammingWindow(size) {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (size - 1));
    }
    return window;
  }
  
  applyWindow(samples, window) {
    const windowed = new Float32Array(samples.length);
    const windowSize = Math.min(samples.length, window.length);
    
    for (let i = 0; i < windowSize; i++) {
      windowed[i] = samples[i] * window[i];
    }
    
    return windowed;
  }
  
  calculateSpectralCentroid(spectrum) {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = i * this.sampleRate / (2 * spectrum.length);
      weightedSum += frequency * spectrum[i];
      magnitudeSum += spectrum[i];
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }
  
  calculateSpectralRolloff(spectrum) {
    const totalEnergy = spectrum.reduce((sum, val) => sum + val * val, 0);
    const threshold = totalEnergy * 0.85;
    
    let cumulativeEnergy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      cumulativeEnergy += spectrum[i] * spectrum[i];
      if (cumulativeEnergy >= threshold) {
        return i * this.sampleRate / (2 * spectrum.length);
      }
    }
    
    return this.sampleRate / 2;
  }
  
  calculateSpectralFlux(spectrum) {
    let flux = 0;
    for (let i = 0; i < Math.min(spectrum.length, this.spectralAnalysis.previousSpectrum.length); i++) {
      const diff = spectrum[i] - this.spectralAnalysis.previousSpectrum[i];
      flux += diff * diff;
    }
    return Math.sqrt(flux / spectrum.length);
  }
  
  calculateSpectralBandwidth(spectrum) {
    const centroid = this.calculateSpectralCentroid(spectrum);
    let weightedVariance = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = i * this.sampleRate / (2 * spectrum.length);
      const diff = frequency - centroid;
      weightedVariance += diff * diff * spectrum[i];
      magnitudeSum += spectrum[i];
    }
    
    return magnitudeSum > 0 ? Math.sqrt(weightedVariance / magnitudeSum) : 0;
  }
  
  calculateHarmonicity(spectrum) {
    let harmonicEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const energy = spectrum[i] * spectrum[i];
      totalEnergy += energy;
      
      // Check for harmonic frequencies (simplified)
      const frequency = i * this.sampleRate / (2 * spectrum.length);
      if (frequency >= 100 && frequency <= 500) {
        harmonicEnergy += energy;
      }
    }
    
    return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0;
  }
  
  // Placeholder methods for advanced features
  calculateMFCC(spectrum) {
    // Simplified MFCC calculation
    return new Array(13).fill(0).map(() => Math.random() - 0.5);
  }
  
  calculateChromaVector(spectrum) {
    // Simplified chroma vector calculation
    return new Array(12).fill(0).map(() => Math.random());
  }
  
  estimateTempo(samples) {
    return 120; // Placeholder
  }
  
  analyzeRhythm(samples) {
    return { strength: 0.5, regularity: 0.7 }; // Placeholder
  }
  
  estimatePitch(samples) {
    // Simple autocorrelation-based pitch estimation
    const minPeriod = Math.floor(this.sampleRate / 500);
    const maxPeriod = Math.floor(this.sampleRate / 80);
    
    let maxCorrelation = 0;
    let bestPeriod = 0;
    
    for (let period = minPeriod; period < Math.min(maxPeriod, samples.length / 2); period++) {
      let correlation = 0;
      
      for (let i = 0; i < samples.length - period; i++) {
        correlation += samples[i] * samples[i + period];
      }
      
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestPeriod = period;
      }
    }
    
    return bestPeriod > 0 ? this.sampleRate / bestPeriod : 0;
  }
  
  extractWakeWordFeatures(samples) {
    return {
      energy: this.calculateRMS(samples),
      zcr: this.calculateZeroCrossingRate(samples),
      spectral: this.extractSpectralFeatures(samples),
      pitch: this.estimatePitch(samples)
    };
  }
  
  matchKeywordPattern(features, keyword) {
    // Simplified pattern matching
    // In production, this would use trained models
    const energyScore = features.energy > 0.01 ? 0.3 : 0;
    const zcrScore = (features.zcr > 0.1 && features.zcr < 0.5) ? 0.2 : 0;
    const spectralScore = features.spectral.spectralCentroid > 500 ? 0.3 : 0;
    const pitchScore = features.pitch > 100 ? 0.2 : 0;
    
    return energyScore + zcrScore + spectralScore + pitchScore;
  }
  
  updateNoiseProfile(noiseProfile) {
    if (noiseProfile && noiseProfile.length === this.spectralSubtraction.noiseSpectrum.length) {
      this.spectralSubtraction.noiseSpectrum.set(noiseProfile);
    }
  }
  
  calculateNoiseReduction(original, enhanced) {
    const originalRMS = this.calculateRMS(original);
    const enhancedRMS = this.calculateRMS(enhanced);
    return originalRMS > 0 ? 20 * Math.log10(originalRMS / enhancedRMS) : 0;
  }
  
  calculateEnhancementMetrics(original, enhanced) {
    return {
      snrImprovement: this.calculateNoiseReduction(original, enhanced),
      dynamicRangeImprovement: this.calculatePeak(enhanced) / this.calculatePeak(original),
      spectralClarity: this.calculateRMS(enhanced) / this.calculateRMS(original)
    };
  }
  
  updateMetrics(processingTime) {
    this.tasksProcessed++;
    this.totalProcessingTime += processingTime;
    
    // Estimate memory usage
    this.memoryUsage = this.estimateMemoryUsage();
  }
  
  estimateMemoryUsage() {
    // Rough estimate of memory usage in MB
    return (this.tasksProcessed * 0.1) + 5; // Base 5MB + 0.1MB per task
  }
  
  getPerformanceMetrics() {
    return {
      tasksProcessed: this.tasksProcessed,
      avgProcessingTime: this.tasksProcessed > 0 ? this.totalProcessingTime / this.tasksProcessed : 0,
      memoryUsage: this.memoryUsage,
      isInitialized: this.isInitialized
    };
  }
}

// Worker message handling
const audioProcessor = new AudioProcessor();

self.onmessage = async function(event) {
  const { type, data } = event.data;
  
  try {
    let response;
    
    switch (type) {
      case 'init':
        response = await audioProcessor.initialize(data.config || {});
        if (response.success) {
          self.postMessage({ type: 'ready', workerId: data.workerId });
        } else {
          self.postMessage({ type: 'error', error: response.error });
        }
        break;
        
      case 'process_task':
        response = await audioProcessor.processTask(data.task);
        
        if (response.success) {
          self.postMessage({
            type: 'task_complete',
            taskId: data.task.id,
            result: response.result,
            processingTime: response.processingTime,
            memoryUsage: response.memoryUsage
          });
        } else {
          self.postMessage({
            type: 'task_error',
            taskId: data.task.id,
            error: response.error,
            processingTime: response.processingTime
          });
        }
        break;
        
      case 'get_metrics':
        response = audioProcessor.getPerformanceMetrics();
        self.postMessage({
          type: 'metrics',
          metrics: response
        });
        break;
        
      default:
        console.warn('Unknown message type:', type);
    }
    
  } catch (error) {
    console.error('Audio worker error:', error);
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
};

// Send periodic heartbeat
setInterval(() => {
  self.postMessage({
    type: 'heartbeat',
    memoryUsage: audioProcessor.estimateMemoryUsage(),
    tasksProcessed: audioProcessor.tasksProcessed
  });
}, 5000);