/**
 * VAD Processor Worklet
 * High-performance Voice Activity Detection in AudioWorklet thread
 * Real-time speech detection with minimal latency
 */

class VADProcessorWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Configuration
    this.frameSize = options.processorOptions?.frameSize || 1024;
    this.hopLength = options.processorOptions?.hopLength || 512;
    this.preEmphasis = options.processorOptions?.preEmphasis || 0.97;
    this.sampleRate = sampleRate; // AudioWorklet global
    
    // VAD state
    this.frameCounter = 0;
    this.speechActive = false;
    this.speechFrameCount = 0;
    this.silenceFrameCount = 0;
    
    // Buffers
    this.frameBuffer = new Float32Array(this.frameSize);
    this.bufferIndex = 0;
    this.previousFrame = new Float32Array(this.frameSize);
    
    // Thresholds and parameters
    this.energyThreshold = 0.01;
    this.zcrThreshold = 0.3;
    this.spectralThreshold = 0.5;
    this.noiseFloor = 0.001;
    this.adaptationRate = 0.05;
    
    // Feature history for smoothing
    this.energyHistory = [];
    this.zcrHistory = [];
    this.spectralHistory = [];
    this.historySize = 10;
    
    // Temporal smoothing
    this.triggerFrames = 3;
    this.hangoverFrames = 10;
    
    // Performance tracking
    this.processingTimes = [];
    
    console.log('🎯 VAD Processor Worklet initialized');
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0];
      const outputChannel = output[0];
      
      // Pass-through audio
      outputChannel.set(inputChannel);
      
      // Start performance measurement
      const startTime = currentTime * 1000; // Convert to milliseconds
      
      // Process audio for VAD
      this.processAudioForVAD(inputChannel);
      
      // Track performance
      const processingTime = (currentTime * 1000) - startTime;
      this.updatePerformanceMetrics(processingTime);
    }
    
    return true; // Keep processor alive
  }
  
  processAudioForVAD(audioData) {
    // Fill frame buffer
    for (let i = 0; i < audioData.length; i++) {
      this.frameBuffer[this.bufferIndex] = audioData[i];
      this.bufferIndex++;
      
      // Process when frame is full
      if (this.bufferIndex >= this.frameSize) {
        this.processFrame();
        
        // Overlap and add for hop length
        const shift = this.frameSize - this.hopLength;
        for (let j = 0; j < shift; j++) {
          this.frameBuffer[j] = this.frameBuffer[j + this.hopLength];
        }
        this.bufferIndex = shift;
      }
    }
  }
  
  processFrame() {
    const frame = new Float32Array(this.frameBuffer);
    
    // Apply pre-emphasis
    if (this.preEmphasis > 0) {
      this.applyPreEmphasis(frame);
    }
    
    // Extract features
    const features = this.extractFeatures(frame);
    
    // VAD decision
    const vadResult = this.makeVADDecision(features);
    
    // Apply temporal smoothing
    const smoothedResult = this.applyTemporalSmoothing(vadResult);
    
    // Update adaptive thresholds
    this.updateAdaptiveThresholds(features, smoothedResult);
    
    // Send result to main thread
    this.port.postMessage({
      type: 'vad-result',
      result: {
        isSpeech: smoothedResult.isSpeech,
        confidence: smoothedResult.confidence,
        features: features,
        frameIndex: this.frameCounter,
        timestamp: currentTime * 1000
      }
    });
    
    // Store previous frame for spectral flux
    this.previousFrame.set(frame);
    this.frameCounter++;
  }
  
  applyPreEmphasis(frame) {
    for (let i = frame.length - 1; i > 0; i--) {
      frame[i] = frame[i] - this.preEmphasis * frame[i - 1];
    }
  }
  
  extractFeatures(frame) {
    // Energy calculation
    const energy = this.calculateEnergy(frame);
    
    // Zero Crossing Rate
    const zcr = this.calculateZCR(frame);
    
    // Spectral features (simplified)
    const spectralFeatures = this.calculateSpectralFeatures(frame);
    
    // Temporal features
    const temporalFeatures = this.calculateTemporalFeatures(frame);
    
    return {
      energy: energy,
      zcr: zcr,
      spectralCentroid: spectralFeatures.centroid,
      spectralRolloff: spectralFeatures.rolloff,
      spectralFlux: spectralFeatures.flux,
      harmonicity: spectralFeatures.harmonicity,
      pitch: temporalFeatures.pitch,
      voicedness: temporalFeatures.voicedness
    };
  }
  
  calculateEnergy(frame) {
    let energy = 0;
    for (let i = 0; i < frame.length; i++) {
      energy += frame[i] * frame[i];
    }
    return Math.sqrt(energy / frame.length);
  }
  
  calculateZCR(frame) {
    let crossings = 0;
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i] >= 0) !== (frame[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / (frame.length - 1);
  }
  
  calculateSpectralFeatures(frame) {
    // Simple magnitude spectrum
    const spectrum = this.calculateMagnitudeSpectrum(frame);
    
    // Spectral centroid
    const centroid = this.calculateSpectralCentroid(spectrum);
    
    // Spectral rolloff
    const rolloff = this.calculateSpectralRolloff(spectrum);
    
    // Spectral flux
    const flux = this.calculateSpectralFlux(spectrum);
    
    // Harmonicity
    const harmonicity = this.calculateHarmonicity(spectrum);
    
    return {
      centroid: centroid,
      rolloff: rolloff,
      flux: flux,
      harmonicity: harmonicity
    };
  }
  
  calculateMagnitudeSpectrum(frame) {
    // Simplified DFT for magnitude spectrum
    const spectrum = new Float32Array(frame.length / 2);
    
    for (let k = 0; k < spectrum.length; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < frame.length; n++) {
        const angle = -2 * Math.PI * k * n / frame.length;
        real += frame[n] * Math.cos(angle);
        imag += frame[n] * Math.sin(angle);
      }
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return spectrum;
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
    if (this.previousFrame.length === 0) return 0;
    
    const prevSpectrum = this.calculateMagnitudeSpectrum(this.previousFrame);
    
    let flux = 0;
    for (let i = 0; i < Math.min(spectrum.length, prevSpectrum.length); i++) {
      const diff = spectrum[i] - prevSpectrum[i];
      flux += diff * diff;
    }
    
    return Math.sqrt(flux / spectrum.length);
  }
  
  calculateHarmonicity(spectrum) {
    // Simplified harmonicity measure
    let harmonicEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const energy = spectrum[i] * spectrum[i];
      totalEnergy += energy;
      
      // Consider frequencies in speech harmonic range
      const frequency = i * this.sampleRate / (2 * spectrum.length);
      if (frequency >= 100 && frequency <= 500) { // Fundamental frequency range
        harmonicEnergy += energy;
      }
    }
    
    return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0;
  }
  
  calculateTemporalFeatures(frame) {
    // Pitch estimation using autocorrelation
    const pitch = this.estimatePitch(frame);
    
    // Voicedness measure
    const voicedness = this.calculateVoicedness(frame, pitch);
    
    return {
      pitch: pitch,
      voicedness: voicedness
    };
  }
  
  estimatePitch(frame) {
    // Simple autocorrelation-based pitch estimation
    const minPeriod = Math.floor(this.sampleRate / 500); // 500 Hz max
    const maxPeriod = Math.floor(this.sampleRate / 80);  // 80 Hz min
    
    let maxCorrelation = 0;
    let bestPeriod = 0;
    
    for (let period = minPeriod; period < Math.min(maxPeriod, frame.length / 2); period++) {
      let correlation = 0;
      let energy1 = 0, energy2 = 0;
      
      for (let i = 0; i < frame.length - period; i++) {
        correlation += frame[i] * frame[i + period];
        energy1 += frame[i] * frame[i];
        energy2 += frame[i + period] * frame[i + period];
      }
      
      // Normalized correlation
      const normalizedCorr = correlation / Math.sqrt(energy1 * energy2 + 1e-10);
      
      if (normalizedCorr > maxCorrelation) {
        maxCorrelation = normalizedCorr;
        bestPeriod = period;
      }
    }
    
    return bestPeriod > 0 ? this.sampleRate / bestPeriod : 0;
  }
  
  calculateVoicedness(frame, pitch) {
    if (pitch === 0) return 0;
    
    const period = Math.floor(this.sampleRate / pitch);
    if (period >= frame.length / 2) return 0;
    
    // Calculate correlation at estimated pitch period
    let correlation = 0;
    let energy = 0;
    
    for (let i = 0; i < frame.length - period; i++) {
      correlation += frame[i] * frame[i + period];
      energy += frame[i] * frame[i];
    }
    
    return energy > 0 ? Math.abs(correlation) / energy : 0;
  }
  
  makeVADDecision(features) {
    // Multi-feature VAD decision
    
    // Energy-based decision
    const energyScore = features.energy > this.energyThreshold ? 1 : 0;
    
    // ZCR-based decision (speech has moderate ZCR)
    const zcrScore = (features.zcr > 0.1 && features.zcr < this.zcrThreshold) ? 1 : 0;
    
    // Spectral-based decision
    const spectralScore = features.spectralCentroid > 300 && features.spectralCentroid < 3000 ? 1 : 0;
    
    // Harmonicity-based decision
    const harmonicScore = features.harmonicity > 0.3 ? 1 : 0;
    
    // Pitch-based decision
    const pitchScore = features.pitch > 80 && features.pitch < 500 ? 1 : 0;
    
    // Voicedness-based decision
    const voicednessScore = features.voicedness > 0.5 ? 1 : 0;
    
    // Combine decisions with weights
    const confidence = (
      energyScore * 0.3 +
      zcrScore * 0.15 +
      spectralScore * 0.2 +
      harmonicScore * 0.15 +
      pitchScore * 0.1 +
      voicednessScore * 0.1
    );
    
    return {
      isSpeech: confidence > 0.5,
      confidence: confidence,
      scores: {
        energy: energyScore,
        zcr: zcrScore,
        spectral: spectralScore,
        harmonic: harmonicScore,
        pitch: pitchScore,
        voicedness: voicednessScore
      }
    };
  }
  
  applyTemporalSmoothing(vadResult) {
    // Update frame counters
    if (vadResult.isSpeech) {
      this.speechFrameCount++;
      this.silenceFrameCount = 0;
    } else {
      this.speechFrameCount = 0;
      this.silenceFrameCount++;
    }
    
    // Apply trigger and hangover logic
    let finalDecision = vadResult.isSpeech;
    
    if (!this.speechActive && this.speechFrameCount >= this.triggerFrames) {
      // Trigger speech
      this.speechActive = true;
      finalDecision = true;
    } else if (this.speechActive && this.silenceFrameCount >= this.hangoverFrames) {
      // End speech
      this.speechActive = false;
      finalDecision = false;
    } else if (this.speechActive) {
      // Continue speech during hangover
      finalDecision = true;
    }
    
    return {
      isSpeech: finalDecision,
      confidence: vadResult.confidence
    };
  }
  
  updateAdaptiveThresholds(features, vadResult) {
    // Update feature histories
    this.energyHistory.push(features.energy);
    this.zcrHistory.push(features.zcr);
    
    // Maintain history size
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
      this.zcrHistory.shift();
    }
    
    // Update noise floor during silence
    if (!vadResult.isSpeech && this.silenceFrameCount > 5) {
      this.noiseFloor = (1 - this.adaptationRate) * this.noiseFloor + 
                       this.adaptationRate * features.energy;
    }
    
    // Adapt energy threshold
    if (this.energyHistory.length >= this.historySize) {
      const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
      const targetThreshold = Math.max(this.noiseFloor * 2, avgEnergy * 0.3);
      
      this.energyThreshold = (1 - this.adaptationRate) * this.energyThreshold + 
                            this.adaptationRate * targetThreshold;
    }
    
    // Adapt ZCR threshold based on recent activity
    if (this.zcrHistory.length >= this.historySize) {
      const avgZCR = this.zcrHistory.reduce((a, b) => a + b, 0) / this.zcrHistory.length;
      this.zcrThreshold = Math.max(0.2, Math.min(0.5, avgZCR * 1.5));
    }
  }
  
  updatePerformanceMetrics(processingTime) {
    this.processingTimes.push(processingTime);
    
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    
    // Send performance update every 100 frames
    if (this.frameCounter % 100 === 0) {
      const avgTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      
      this.port.postMessage({
        type: 'performance',
        data: {
          avgProcessingTime: avgTime,
          maxProcessingTime: Math.max(...this.processingTimes),
          framesProcessed: this.frameCounter,
          currentThresholds: {
            energy: this.energyThreshold,
            zcr: this.zcrThreshold,
            noiseFloor: this.noiseFloor
          }
        }
      });
    }
  }
}

// Register the processor
registerProcessor('vad-processor', VADProcessorWorklet);