/**
 * Voice Emotion Detection and Analysis
 * Analyzes voice patterns to detect emotional state and stress levels
 * Helps PAM provide more empathetic and contextually appropriate responses
 */

interface EmotionConfig {
  enabled: boolean;
  analysisInterval: number;
  sensitivityLevel: number; // 0.0 to 1.0
  smoothingFactor: number; // For temporal smoothing
  minConfidenceThreshold: number;
  contextualAdaptation: boolean;
}

interface EmotionFeatures {
  // Prosodic features
  pitch: {
    mean: number;
    variance: number;
    range: number;
    trend: number; // Rising/falling
  };
  
  // Energy features
  energy: {
    rms: number;
    variance: number;
    spectralCentroid: number;
  };
  
  // Temporal features
  tempo: {
    speechRate: number;
    pauseFrequency: number;
    rhythmVariability: number;
  };
  
  // Spectral features
  spectral: {
    harmonicRatio: number;
    noiseRatio: number;
    formantFrequencies: number[];
    bandwidth: number;
  };
}

interface EmotionResult {
  primary: EmotionType;
  confidence: number;
  intensity: number; // 0.0 to 1.0
  valence: number; // -1.0 (negative) to 1.0 (positive)
  arousal: number; // 0.0 (calm) to 1.0 (excited)
  stress_level: number; // 0.0 to 1.0
  timestamp: number;
  features: EmotionFeatures;
  secondary_emotions: Array<{
    emotion: EmotionType;
    confidence: number;
  }>;
}

enum EmotionType {
  NEUTRAL = "neutral",
  HAPPY = "happy",
  SAD = "sad",
  ANGRY = "angry",
  SURPRISED = "surprised",
  FEARFUL = "fearful",
  DISGUSTED = "disgusted",
  EXCITED = "excited",
  FRUSTRATED = "frustrated",
  STRESSED = "stressed",
  CALM = "calm",
  CONFUSED = "confused",
  CONFIDENT = "confident",
  UNCERTAIN = "uncertain"
}

interface EmotionCallbacks {
  onEmotionDetected?: (result: EmotionResult) => void;
  onStressLevelChange?: (level: number, previous: number) => void;
  onMoodShift?: (from: EmotionType, to: EmotionType, intensity: number) => void;
  onHighStressDetected?: (level: number) => void;
}

export class EmotionAnalyzer {
  private config: EmotionConfig;
  private callbacks: EmotionCallbacks;
  private audioContext: AudioContext;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // Analysis state
  private isAnalyzing = false;
  private emotionHistory: EmotionResult[] = [];
  private currentEmotion: EmotionType = EmotionType.NEUTRAL;
  private currentStressLevel = 0.0;
  private baselineFeatures: EmotionFeatures | null = null;
  
  // Audio processing
  private fftSize = 2048;
  private frequencyData = new Uint8Array(this.fftSize / 2);
  private timeData = new Uint8Array(this.fftSize);
  private pitchHistory: number[] = [];
  private energyHistory: number[] = [];
  
  // Feature extraction
  private windowSize = 1024;
  private hopSize = 512;
  private sampleRate = 16000;

  constructor(config: Partial<EmotionConfig> = {}, callbacks: EmotionCallbacks = {}) {
    this.config = {
      enabled: true,
      analysisInterval: 200, // Analyze every 200ms
      sensitivityLevel: 0.7,
      smoothingFactor: 0.3,
      minConfidenceThreshold: 0.6,
      contextualAdaptation: true,
      ...config
    };
    
    this.callbacks = callbacks;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.sampleRate,
      latencyHint: 'interactive'
    });
  }

  async initialize(stream: MediaStream): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('😐 Emotion analysis disabled');
      return false;
    }

    console.log('🎭 Initializing Emotion Analyzer...');
    
    try {
      // Setup audio processing chain
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.processor = this.audioContext.createScriptProcessor(this.windowSize, 1, 1);

      // Configure analyser for emotion detection
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.2;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // Setup processing
      this.processor.onaudioprocess = (event) => {
        if (this.isAnalyzing) {
          this.analyzeEmotionFrame(event.inputBuffer);
        }
      };

      // Connect audio graph
      this.source.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Establish baseline over first few seconds
      await this.establishBaseline();

      console.log('✅ Emotion Analyzer initialized');
      return true;

    } catch (error) {
      console.error('❌ Emotion Analyzer initialization failed:', error);
      return false;
    }
  }

  startAnalysis(): void {
    if (!this.analyser || !this.processor) {
      console.warn('⚠️ Emotion Analyzer not initialized');
      return;
    }

    console.log('🎭 Starting emotion analysis...');
    this.isAnalyzing = true;
  }

  stopAnalysis(): void {
    console.log('🛑 Stopping emotion analysis...');
    this.isAnalyzing = false;
  }

  destroy(): void {
    console.log('🛑 Destroying Emotion Analyzer...');
    
    this.stopAnalysis();
    
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

  private async establishBaseline(): Promise<void> {
    console.log('📊 Establishing emotion baseline...');
    
    const baselineDuration = 3000; // 3 seconds
    const samples: EmotionFeatures[] = [];
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const baselineInterval = setInterval(() => {
        if (!this.analyser) {
          clearInterval(baselineInterval);
          resolve();
          return;
        }
        
        const features = this.extractAudioFeatures();
        if (features) {
          samples.push(features);
        }
        
        if (Date.now() - startTime >= baselineDuration) {
          clearInterval(baselineInterval);
          
          // Calculate baseline averages
          if (samples.length > 0) {
            this.baselineFeatures = this.calculateBaselineFeatures(samples);
            console.log('📊 Baseline established');
          }
          
          resolve();
        }
      }, 100);
    });
  }

  private calculateBaselineFeatures(samples: EmotionFeatures[]): EmotionFeatures {
    const avgPitch = samples.reduce((sum, s) => sum + s.pitch.mean, 0) / samples.length;
    const avgEnergy = samples.reduce((sum, s) => sum + s.energy.rms, 0) / samples.length;
    const avgSpeechRate = samples.reduce((sum, s) => sum + s.tempo.speechRate, 0) / samples.length;
    
    return {
      pitch: {
        mean: avgPitch,
        variance: this.calculateVariance(samples.map(s => s.pitch.mean)),
        range: Math.max(...samples.map(s => s.pitch.range)),
        trend: 0
      },
      energy: {
        rms: avgEnergy,
        variance: this.calculateVariance(samples.map(s => s.energy.rms)),
        spectralCentroid: samples.reduce((sum, s) => sum + s.energy.spectralCentroid, 0) / samples.length
      },
      tempo: {
        speechRate: avgSpeechRate,
        pauseFrequency: samples.reduce((sum, s) => sum + s.tempo.pauseFrequency, 0) / samples.length,
        rhythmVariability: 0
      },
      spectral: {
        harmonicRatio: samples.reduce((sum, s) => sum + s.spectral.harmonicRatio, 0) / samples.length,
        noiseRatio: samples.reduce((sum, s) => sum + s.spectral.noiseRatio, 0) / samples.length,
        formantFrequencies: [],
        bandwidth: samples.reduce((sum, s) => sum + s.spectral.bandwidth, 0) / samples.length
      }
    };
  }

  private analyzeEmotionFrame(buffer: AudioBuffer): void {
    try {
      // Extract audio features
      const features = this.extractAudioFeaturesFromBuffer(buffer);
      if (!features) return;

      // Classify emotion
      const emotionResult = this.classifyEmotion(features);
      
      // Apply temporal smoothing
      const smoothedResult = this.applySmoothingFilters(emotionResult);
      
      // Update state
      this.updateEmotionState(smoothedResult);
      
      // Store in history
      this.emotionHistory.push(smoothedResult);
      if (this.emotionHistory.length > 100) {
        this.emotionHistory.shift();
      }
      
      // Trigger callbacks
      this.triggerCallbacks(smoothedResult);
      
    } catch (error) {
      console.error('❌ Emotion analysis frame error:', error);
    }
  }

  private extractAudioFeatures(): EmotionFeatures | null {
    if (!this.analyser) return null;
    
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeData);
    
    return this.calculateFeaturesFromData(this.timeData, this.frequencyData);
  }

  private extractAudioFeaturesFromBuffer(buffer: AudioBuffer): EmotionFeatures | null {
    const channelData = buffer.getChannelData(0);
    
    // Convert to frequency domain for spectral analysis
    const fftData = this.performFFT(channelData);
    
    return this.calculateFeaturesFromChannelData(channelData, fftData);
  }

  private calculateFeaturesFromData(timeData: Uint8Array, frequencyData: Uint8Array): EmotionFeatures {
    // Pitch estimation using autocorrelation
    const pitch = this.estimatePitch(timeData);
    
    // Energy calculation
    const energy = this.calculateEnergy(timeData);
    
    // Spectral features
    const spectralCentroid = this.calculateSpectralCentroid(frequencyData);
    const harmonicRatio = this.calculateHarmonicRatio(frequencyData);
    
    // Temporal features
    const speechRate = this.estimateSpeechRate(timeData);
    
    return {
      pitch: {
        mean: pitch.mean,
        variance: pitch.variance,
        range: pitch.range,
        trend: pitch.trend
      },
      energy: {
        rms: energy.rms,
        variance: energy.variance,
        spectralCentroid: spectralCentroid
      },
      tempo: {
        speechRate: speechRate,
        pauseFrequency: this.calculatePauseFrequency(timeData),
        rhythmVariability: this.calculateRhythmVariability(timeData)
      },
      spectral: {
        harmonicRatio: harmonicRatio,
        noiseRatio: 1 - harmonicRatio,
        formantFrequencies: this.estimateFormants(frequencyData),
        bandwidth: this.calculateSpectralBandwidth(frequencyData)
      }
    };
  }

  private calculateFeaturesFromChannelData(channelData: Float32Array, fftData: Float32Array): EmotionFeatures {
    // Similar to calculateFeaturesFromData but works with Float32Array
    const pitch = this.estimatePitchFromFloat32(channelData);
    const energy = this.calculateEnergyFromFloat32(channelData);
    const spectralFeatures = this.calculateSpectralFeaturesFromFFT(fftData);
    
    return {
      pitch: pitch,
      energy: energy,
      tempo: {
        speechRate: this.estimateSpeechRateFromFloat32(channelData),
        pauseFrequency: 0, // Simplified for real-time processing
        rhythmVariability: 0
      },
      spectral: spectralFeatures
    };
  }

  // Audio analysis helper methods
  private estimatePitch(timeData: Uint8Array): any {
    // Simplified pitch estimation using autocorrelation
    const normalized = new Float32Array(timeData.length);
    for (let i = 0; i < timeData.length; i++) {
      normalized[i] = (timeData[i] - 128) / 128;
    }
    
    const autocorrelation = this.autocorrelate(normalized);
    const pitch = this.findPitch(autocorrelation);
    
    this.pitchHistory.push(pitch);
    if (this.pitchHistory.length > 10) {
      this.pitchHistory.shift();
    }
    
    return {
      mean: pitch,
      variance: this.calculateVariance(this.pitchHistory),
      range: Math.max(...this.pitchHistory) - Math.min(...this.pitchHistory),
      trend: this.calculateTrend(this.pitchHistory)
    };
  }

  private estimatePitchFromFloat32(channelData: Float32Array): any {
    const autocorrelation = this.autocorrelate(channelData);
    const pitch = this.findPitch(autocorrelation);
    
    return {
      mean: pitch,
      variance: 0, // Simplified for single frame
      range: 0,
      trend: 0
    };
  }

  private calculateEnergy(timeData: Uint8Array): any {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const normalized = (timeData[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / timeData.length);
    
    this.energyHistory.push(rms);
    if (this.energyHistory.length > 10) {
      this.energyHistory.shift();
    }
    
    return {
      rms: rms,
      variance: this.calculateVariance(this.energyHistory),
      spectralCentroid: 0 // Calculated separately
    };
  }

  private calculateEnergyFromFloat32(channelData: Float32Array): any {
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);
    
    return {
      rms: rms,
      variance: 0, // Simplified
      spectralCentroid: 0
    };
  }

  private calculateSpectralCentroid(frequencyData: Uint8Array): number {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < frequencyData.length; i++) {
      const magnitude = frequencyData[i] / 255;
      const frequency = i * this.sampleRate / (2 * frequencyData.length);
      
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private autocorrelate(data: Float32Array): Float32Array {
    const result = new Float32Array(data.length);
    
    for (let lag = 0; lag < data.length; lag++) {
      let sum = 0;
      for (let i = 0; i < data.length - lag; i++) {
        sum += data[i] * data[i + lag];
      }
      result[lag] = sum;
    }
    
    return result;
  }

  private findPitch(autocorrelation: Float32Array): number {
    // Find the highest peak after the first minimum
    let minIndex = 0;
    for (let i = 1; i < autocorrelation.length / 3; i++) {
      if (autocorrelation[i] < autocorrelation[minIndex]) {
        minIndex = i;
      }
    }
    
    let maxIndex = minIndex;
    for (let i = minIndex; i < autocorrelation.length / 2; i++) {
      if (autocorrelation[i] > autocorrelation[maxIndex]) {
        maxIndex = i;
      }
    }
    
    return maxIndex > 0 ? this.sampleRate / maxIndex : 0;
  }

  private classifyEmotion(features: EmotionFeatures): EmotionResult {
    // Simplified emotion classification based on acoustic features
    // In production, this would use a trained ML model
    
    let emotion = EmotionType.NEUTRAL;
    let confidence = 0.5;
    let intensity = 0.5;
    let valence = 0.0; // Neutral
    let arousal = 0.5; // Medium arousal
    let stressLevel = 0.0;
    
    if (!this.baselineFeatures) {
      return this.createEmotionResult(emotion, confidence, intensity, valence, arousal, stressLevel, features);
    }
    
    // Compare with baseline
    const pitchDeviation = Math.abs(features.pitch.mean - this.baselineFeatures.pitch.mean) / this.baselineFeatures.pitch.mean;
    const energyDeviation = Math.abs(features.energy.rms - this.baselineFeatures.energy.rms) / this.baselineFeatures.energy.rms;
    const speechRateDeviation = Math.abs(features.tempo.speechRate - this.baselineFeatures.tempo.speechRate) / this.baselineFeatures.tempo.speechRate;
    
    // Stress detection
    if (pitchDeviation > 0.3 || energyDeviation > 0.4 || speechRateDeviation > 0.3) {
      stressLevel = Math.min(1.0, (pitchDeviation + energyDeviation + speechRateDeviation) / 3);
    }
    
    // Emotion classification rules
    if (features.pitch.mean > this.baselineFeatures.pitch.mean * 1.2 && features.energy.rms > this.baselineFeatures.energy.rms * 1.1) {
      if (features.tempo.speechRate > this.baselineFeatures.tempo.speechRate * 1.1) {
        emotion = EmotionType.EXCITED;
        valence = 0.7;
        arousal = 0.8;
      } else {
        emotion = EmotionType.HAPPY;
        valence = 0.6;
        arousal = 0.6;
      }
      confidence = 0.7;
      intensity = 0.7;
    }
    else if (features.pitch.mean < this.baselineFeatures.pitch.mean * 0.8 && features.energy.rms < this.baselineFeatures.energy.rms * 0.8) {
      emotion = EmotionType.SAD;
      valence = -0.6;
      arousal = 0.3;
      confidence = 0.6;
      intensity = 0.6;
    }
    else if (features.energy.variance > this.baselineFeatures.energy.variance * 2 && features.tempo.speechRate > this.baselineFeatures.tempo.speechRate * 1.2) {
      emotion = EmotionType.ANGRY;
      valence = -0.4;
      arousal = 0.8;
      confidence = 0.7;
      intensity = 0.8;
    }
    else if (stressLevel > 0.6) {
      emotion = EmotionType.STRESSED;
      valence = -0.3;
      arousal = 0.7;
      confidence = stressLevel;
      intensity = stressLevel;
    }
    else if (features.pitch.variance > this.baselineFeatures.pitch.variance * 1.5) {
      emotion = EmotionType.UNCERTAIN;
      valence = -0.2;
      arousal = 0.6;
      confidence = 0.6;
      intensity = 0.5;
    }
    
    return this.createEmotionResult(emotion, confidence, intensity, valence, arousal, stressLevel, features);
  }

  private createEmotionResult(
    emotion: EmotionType,
    confidence: number,
    intensity: number,
    valence: number,
    arousal: number,
    stressLevel: number,
    features: EmotionFeatures
  ): EmotionResult {
    return {
      primary: emotion,
      confidence: confidence,
      intensity: intensity,
      valence: valence,
      arousal: arousal,
      stress_level: stressLevel,
      timestamp: Date.now(),
      features: features,
      secondary_emotions: [] // Simplified for this implementation
    };
  }

  private applySmoothingFilters(result: EmotionResult): EmotionResult {
    // Apply temporal smoothing
    if (this.emotionHistory.length > 0) {
      const recent = this.emotionHistory.slice(-3); // Last 3 results
      const avgConfidence = recent.reduce((sum, r) => sum + r.confidence, 0) / recent.length;
      const avgIntensity = recent.reduce((sum, r) => sum + r.intensity, 0) / recent.length;
      
      // Smooth confidence and intensity
      result.confidence = result.confidence * (1 - this.config.smoothingFactor) + avgConfidence * this.config.smoothingFactor;
      result.intensity = result.intensity * (1 - this.config.smoothingFactor) + avgIntensity * this.config.smoothingFactor;
    }
    
    return result;
  }

  private updateEmotionState(result: EmotionResult): void {
    const previousEmotion = this.currentEmotion;
    const previousStressLevel = this.currentStressLevel;
    
    // Update current state
    if (result.confidence > this.config.minConfidenceThreshold) {
      this.currentEmotion = result.primary;
    }
    this.currentStressLevel = result.stress_level;
    
    // Detect mood shifts
    if (previousEmotion !== this.currentEmotion && result.confidence > this.config.minConfidenceThreshold) {
      this.callbacks.onMoodShift?.(previousEmotion, this.currentEmotion, result.intensity);
    }
    
    // Detect stress level changes
    if (Math.abs(this.currentStressLevel - previousStressLevel) > 0.2) {
      this.callbacks.onStressLevelChange?.(this.currentStressLevel, previousStressLevel);
    }
    
    // Alert for high stress
    if (this.currentStressLevel > 0.8) {
      this.callbacks.onHighStressDetected?.(this.currentStressLevel);
    }
  }

  private triggerCallbacks(result: EmotionResult): void {
    try {
      this.callbacks.onEmotionDetected?.(result);
    } catch (error) {
      console.error('❌ Emotion callback error:', error);
    }
  }

  // Utility methods
  private calculateVariance(data: number[]): number {
    if (data.length === 0) return 0;
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return variance;
  }

  private calculateTrend(data: number[]): number {
    if (data.length < 2) return 0;
    const recent = data.slice(-5); // Last 5 values
    const slope = (recent[recent.length - 1] - recent[0]) / recent.length;
    return slope;
  }

  private performFFT(data: Float32Array): Float32Array {
    // Simplified FFT - in production would use a proper FFT library
    // This is a placeholder that returns the input data
    return data;
  }

  private calculateSpectralFeaturesFromFFT(fftData: Float32Array): any {
    return {
      harmonicRatio: 0.7, // Simplified
      noiseRatio: 0.3,
      formantFrequencies: [800, 1200, 2500], // Typical formant frequencies
      bandwidth: 4000
    };
  }

  private estimateSpeechRate(timeData: Uint8Array): number {
    // Simplified speech rate estimation
    return 3.5; // Average syllables per second
  }

  private estimateSpeechRateFromFloat32(channelData: Float32Array): number {
    return 3.5; // Simplified
  }

  private calculatePauseFrequency(timeData: Uint8Array): number {
    return 0.5; // Simplified
  }

  private calculateRhythmVariability(timeData: Uint8Array): number {
    return 0.3; // Simplified
  }

  private calculateHarmonicRatio(frequencyData: Uint8Array): number {
    // Simplified harmonic ratio calculation
    let harmonicEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < frequencyData.length; i++) {
      const magnitude = frequencyData[i] / 255;
      totalEnergy += magnitude;
      
      // Consider harmonics (simplified)
      if (i % 2 === 0) { // Even indices as simplified harmonics
        harmonicEnergy += magnitude;
      }
    }
    
    return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0.5;
  }

  private estimateFormants(frequencyData: Uint8Array): number[] {
    // Simplified formant estimation
    return [800, 1200, 2500]; // Typical English formants
  }

  private calculateSpectralBandwidth(frequencyData: Uint8Array): number {
    // Simplified bandwidth calculation
    return 4000; // Typical speech bandwidth
  }

  // Public API
  getCurrentEmotion(): EmotionType {
    return this.currentEmotion;
  }

  getCurrentStressLevel(): number {
    return this.currentStressLevel;
  }

  getEmotionHistory(limit: number = 10): EmotionResult[] {
    return this.emotionHistory.slice(-limit);
  }

  getEmotionSummary(): {
    dominantEmotion: EmotionType;
    averageStress: number;
    emotionDistribution: Record<EmotionType, number>;
  } {
    if (this.emotionHistory.length === 0) {
      return {
        dominantEmotion: EmotionType.NEUTRAL,
        averageStress: 0,
        emotionDistribution: {}
      };
    }

    // Calculate emotion distribution
    const distribution: Record<EmotionType, number> = {};
    let totalStress = 0;

    for (const result of this.emotionHistory) {
      distribution[result.primary] = (distribution[result.primary] || 0) + 1;
      totalStress += result.stress_level;
    }

    // Find dominant emotion
    let dominantEmotion = EmotionType.NEUTRAL;
    let maxCount = 0;
    for (const [emotion, count] of Object.entries(distribution)) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion as EmotionType;
      }
    }

    return {
      dominantEmotion,
      averageStress: totalStress / this.emotionHistory.length,
      emotionDistribution: distribution
    };
  }

  updateConfig(newConfig: Partial<EmotionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Emotion Analyzer config updated');
  }
}