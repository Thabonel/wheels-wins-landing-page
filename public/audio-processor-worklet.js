/**
 * Audio Processor Worklet
 * High-performance audio processing in a separate thread
 * Handles real-time audio analysis and streaming
 */

class AudioProcessorWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    this.bufferSize = options.processorOptions?.bufferSize || 1024;
    this.sampleRate = options.processorOptions?.sampleRate || 16000;
    
    // Processing state
    this.chunkCounter = 0;
    this.processingBuffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    
    // Performance tracking
    this.processingTimes = [];
    this.lastProcessTime = 0;
    
    // Audio analysis
    this.rmsHistory = [];
    this.peakHistory = [];
    this.zcr = 0; // Zero crossing rate
    
    console.log('🎵 AudioProcessorWorklet initialized');
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0];
      const outputChannel = output[0];
      
      // Start performance measurement
      const startTime = performance.now();
      
      // Process audio data
      this.processAudioData(inputChannel, outputChannel);
      
      // Track performance
      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics(processingTime);
      
      // Send performance data periodically
      if (this.chunkCounter % 100 === 0) {
        this.sendPerformanceUpdate();
      }
    }
    
    // Keep processor alive
    return true;
  }
  
  processAudioData(input, output) {
    const frameCount = input.length;
    
    // Copy input to output (pass-through)
    output.set(input);
    
    // Fill processing buffer
    for (let i = 0; i < frameCount; i++) {
      this.processingBuffer[this.bufferIndex] = input[i];
      this.bufferIndex++;
      
      // When buffer is full, process chunk
      if (this.bufferIndex >= this.bufferSize) {
        this.processAudioChunk();
        this.bufferIndex = 0;
      }
    }
  }
  
  processAudioChunk() {
    const chunk = new Float32Array(this.processingBuffer);
    const timestamp = performance.now();
    
    // Analyze audio properties
    const analysis = this.analyzeAudioChunk(chunk);
    
    // Create chunk data
    const chunkData = {
      id: `worklet-${this.chunkCounter++}`,
      data: chunk,
      timestamp: timestamp,
      sampleRate: this.sampleRate,
      duration: (this.bufferSize / this.sampleRate) * 1000,
      analysis: analysis
    };
    
    // Send chunk to main thread
    this.port.postMessage({
      type: 'audio-chunk',
      chunk: chunkData
    });
  }
  
  analyzeAudioChunk(data) {
    // Calculate RMS (Root Mean Square) energy
    let rms = 0;
    let peak = 0;
    let zeroCrossings = 0;
    
    for (let i = 0; i < data.length; i++) {
      const sample = data[i];
      
      // RMS calculation
      rms += sample * sample;
      
      // Peak detection
      const absSample = Math.abs(sample);
      if (absSample > peak) {
        peak = absSample;
      }
      
      // Zero crossing rate
      if (i > 0 && ((data[i-1] >= 0 && sample < 0) || (data[i-1] < 0 && sample >= 0))) {
        zeroCrossings++;
      }
    }
    
    rms = Math.sqrt(rms / data.length);
    const zcr = zeroCrossings / (data.length - 1);
    
    // Update history
    this.rmsHistory.push(rms);
    this.peakHistory.push(peak);
    
    // Maintain history size
    if (this.rmsHistory.length > 100) {
      this.rmsHistory.shift();
      this.peakHistory.shift();
    }
    
    // Calculate spectral features (simplified)
    const spectralCentroid = this.calculateSpectralCentroid(data);
    const spectralRolloff = this.calculateSpectralRolloff(data);
    
    return {
      rms: rms,
      peak: peak,
      zcr: zcr,
      spectralCentroid: spectralCentroid,
      spectralRolloff: spectralRolloff,
      avgRms: this.rmsHistory.reduce((a, b) => a + b, 0) / this.rmsHistory.length,
      avgPeak: this.peakHistory.reduce((a, b) => a + b, 0) / this.peakHistory.length,
      isSpeech: this.detectSpeech(rms, zcr),
      voiceActivity: this.detectVoiceActivity(rms, peak, zcr)
    };
  }
  
  calculateSpectralCentroid(data) {
    // Simplified spectral centroid calculation
    // In a full implementation, this would use FFT
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    // Simple frequency domain approximation
    for (let i = 0; i < data.length / 2; i++) {
      const magnitude = Math.abs(data[i]);
      const frequency = (i / (data.length / 2)) * (this.sampleRate / 2);
      
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }
  
  calculateSpectralRolloff(data) {
    // Simplified spectral rolloff (frequency below which 85% of energy lies)
    let totalEnergy = 0;
    const energies = [];
    
    // Calculate energy distribution
    for (let i = 0; i < data.length / 2; i++) {
      const energy = data[i] * data[i];
      energies.push(energy);
      totalEnergy += energy;
    }
    
    // Find 85% energy point
    const threshold = totalEnergy * 0.85;
    let cumulativeEnergy = 0;
    
    for (let i = 0; i < energies.length; i++) {
      cumulativeEnergy += energies[i];
      if (cumulativeEnergy >= threshold) {
        return (i / energies.length) * (this.sampleRate / 2);
      }
    }
    
    return this.sampleRate / 2;
  }
  
  detectSpeech(rms, zcr) {
    // Simple speech detection based on energy and zero crossing rate
    const energyThreshold = 0.01;
    const zcrMin = 0.1;
    const zcrMax = 0.5;
    
    return rms > energyThreshold && zcr >= zcrMin && zcr <= zcrMax;
  }
  
  detectVoiceActivity(rms, peak, zcr) {
    // Voice Activity Detection (VAD)
    const energyThreshold = 0.005;
    const peakThreshold = 0.1;
    const zcrThreshold = 0.3;
    
    // Consider energy, peak, and spectral characteristics
    const energyScore = Math.min(1, rms / energyThreshold);
    const peakScore = Math.min(1, peak / peakThreshold);
    const zcrScore = zcr < zcrThreshold ? 1 : 0.5;
    
    const vadScore = (energyScore + peakScore + zcrScore) / 3;
    
    return {
      isActive: vadScore > 0.6,
      confidence: vadScore,
      energyScore: energyScore,
      peakScore: peakScore,
      zcrScore: zcrScore
    };
  }
  
  updatePerformanceMetrics(processingTime) {
    this.processingTimes.push(processingTime);
    
    // Keep only recent measurements
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    
    this.lastProcessTime = processingTime;
  }
  
  sendPerformanceUpdate() {
    if (this.processingTimes.length === 0) return;
    
    const avgProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    const maxProcessingTime = Math.max(...this.processingTimes);
    const minProcessingTime = Math.min(...this.processingTimes);
    
    // Calculate CPU usage estimate
    const expectedTime = (this.bufferSize / this.sampleRate) * 1000; // Expected time in ms
    const cpuUsage = Math.min(1, avgProcessingTime / expectedTime);
    
    // Calculate efficiency metrics
    const efficiency = expectedTime / avgProcessingTime;
    const stability = 1 - ((maxProcessingTime - minProcessingTime) / avgProcessingTime);
    
    this.port.postMessage({
      type: 'performance',
      metrics: {
        avgProcessingTime: avgProcessingTime,
        maxProcessingTime: maxProcessingTime,
        minProcessingTime: minProcessingTime,
        cpuUsage: cpuUsage,
        efficiency: efficiency,
        stability: stability,
        chunksProcessed: this.chunkCounter,
        bufferSize: this.bufferSize,
        sampleRate: this.sampleRate
      }
    });
  }
  
  // Handle messages from main thread
  static get parameterDescriptors() {
    return [];
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessorWorklet);