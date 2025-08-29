/**
 * Audio Enhancement Processor Worklet
 * Real-time audio enhancement processing in AudioWorklet thread
 * Implements noise reduction, spectral enhancement, and voice optimization
 */

class AudioEnhancementProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Configuration from main thread
    this.frameSize = options.processorOptions?.frameSize || 1024;
    this.hopSize = options.processorOptions?.hopSize || 512;
    this.sampleRate = options.processorOptions?.sampleRate || sampleRate;
    this.config = options.processorOptions?.config || {};
    
    // Processing state
    this.frameCounter = 0;
    this.isInitialized = false;
    
    // Audio buffers
    this.inputBuffer = new Float32Array(this.frameSize);
    this.outputBuffer = new Float32Array(this.frameSize);
    this.overlapBuffer = new Float32Array(this.frameSize);
    this.bufferIndex = 0;
    
    // Noise reduction components
    this.noiseProfile = null;
    this.spectralSubtraction = {
      alpha: 2.0,        // Over-subtraction factor
      beta: 0.01,        // Spectral floor
      noiseSpectrum: new Float32Array(this.frameSize / 2),
      smoothingFactor: 0.9
    };
    
    // Voice enhancement components
    this.preEmphasisCoeff = 0.97;
    this.preEmphasisState = 0;
    this.compressionState = {
      envelope: 0,
      threshold: 0.7,
      ratio: 4.0,
      attack: 0.003,  // 3ms
      release: 0.1    // 100ms
    };
    
    // Spectral enhancement
    this.equalizerBands = [
      { freq: 100, gain: -3, q: 0.7, type: 'highpass' },
      { freq: 300, gain: 2, q: 1.0, type: 'peak' },
      { freq: 1000, gain: 3, q: 0.8, type: 'peak' },
      { freq: 3000, gain: 2, q: 0.8, type: 'peak' },
      { freq: 8000, gain: -6, q: 0.7, type: 'lowpass' }
    ];
    
    // Performance tracking
    this.processingTimes = [];
    this.qualityMetrics = [];
    
    // FFT-related
    this.fftSize = this.frameSize;
    this.window = this.createHammingWindow(this.frameSize);
    
    console.log('🔊 Audio Enhancement Processor Worklet initialized');
    this.initializeProcessor();
  }
  
  initializeProcessor() {
    // Initialize noise profile
    this.noiseProfile = {
      spectrum: new Float32Array(this.frameSize / 2),
      energy: 0.001,
      isValid: false
    };
    
    // Initialize compressor
    this.compressionState.attack = Math.exp(-1 / (0.003 * this.sampleRate));
    this.compressionState.release = Math.exp(-1 / (0.1 * this.sampleRate));
    
    this.isInitialized = true;
    
    this.port.postMessage({
      type: 'initialized',
      data: {
        frameSize: this.frameSize,
        sampleRate: this.sampleRate,
        isReady: true
      }
    });
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (input.length > 0 && output.length > 0) {
      const inputChannel = input[0];
      const outputChannel = output[0];
      
      const startTime = currentTime * 1000; // Convert to milliseconds
      
      // Process audio enhancement
      this.processAudioData(inputChannel, outputChannel);
      
      // Track performance
      const processingTime = (currentTime * 1000) - startTime;
      this.updatePerformanceMetrics(processingTime);
    }
    
    return true; // Keep processor alive
  }
  
  processAudioData(inputData, outputData) {
    // Fill input buffer with overlap
    for (let i = 0; i < inputData.length; i++) {
      this.inputBuffer[this.bufferIndex] = inputData[i];
      this.bufferIndex++;
      
      // Process when frame is full
      if (this.bufferIndex >= this.frameSize) {
        const enhancedFrame = this.enhanceAudioFrame(this.inputBuffer);
        
        // Overlap-add output
        this.overlapAddOutput(enhancedFrame, outputData, i - this.frameSize + 1);
        
        // Shift buffer for next frame
        this.shiftBuffer();
      }
    }
    
    // Copy any remaining buffered output
    this.copyRemainingOutput(outputData);
  }
  
  enhanceAudioFrame(frame) {
    let enhanced = new Float32Array(frame);
    
    // Apply windowing
    enhanced = this.applyWindow(enhanced);
    
    // Noise reduction
    if (this.config.noiseReduction?.enabled) {
      enhanced = this.applyNoiseReduction(enhanced);
    }
    
    // Voice enhancement
    if (this.config.voiceEnhancement?.enabled) {
      enhanced = this.applyVoiceEnhancement(enhanced);
    }
    
    return enhanced;
  }
  
  applyWindow(frame) {
    const windowed = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      windowed[i] = frame[i] * this.window[i];
    }
    return windowed;
  }
  
  applyNoiseReduction(frame) {
    switch (this.config.noiseReduction.algorithm) {
      case 'spectral_subtraction':
        return this.applySpectralSubtraction(frame);
      case 'wiener_filter':
        return this.applyWienerFilter(frame);
      case 'adaptive':
        return this.applyAdaptiveFilter(frame);
      default:
        return frame;
    }
  }
  
  applySpectralSubtraction(frame) {
    // Compute magnitude spectrum
    const spectrum = this.computeMagnitudeSpectrum(frame);
    const enhancedSpectrum = new Float32Array(spectrum.length);
    
    // Apply spectral subtraction
    for (let i = 0; i < spectrum.length; i++) {
      const noiseLevel = this.noiseProfile.spectrum[i] || 0.001;
      const subtracted = spectrum[i] - this.spectralSubtraction.alpha * noiseLevel;
      enhancedSpectrum[i] = Math.max(
        subtracted,
        this.spectralSubtraction.beta * spectrum[i]
      );
    }
    
    // Convert back to time domain
    return this.spectrumToTimeDomain(enhancedSpectrum, frame.length);
  }
  
  applyWienerFilter(frame) {
    // Simplified Wiener filtering
    const spectrum = this.computeMagnitudeSpectrum(frame);
    const enhancedSpectrum = new Float32Array(spectrum.length);
    
    for (let i = 0; i < spectrum.length; i++) {
      const signal = spectrum[i];
      const noise = this.noiseProfile.spectrum[i] || 0.001;
      const snr = signal / (noise + 1e-10);
      const gain = snr / (snr + 1);
      enhancedSpectrum[i] = signal * gain;
    }
    
    return this.spectrumToTimeDomain(enhancedSpectrum, frame.length);
  }
  
  applyAdaptiveFilter(frame) {
    // Simple adaptive filtering
    const filtered = new Float32Array(frame.length);
    const filterOrder = 8;
    const mu = 0.01;
    
    const weights = new Float32Array(filterOrder);
    const delayLine = new Float32Array(filterOrder);
    
    for (let i = 0; i < frame.length; i++) {
      // Shift delay line
      for (let j = filterOrder - 1; j > 0; j--) {
        delayLine[j] = delayLine[j - 1];
      }
      delayLine[0] = frame[i];
      
      // Calculate filter output
      let output = 0;
      for (let j = 0; j < filterOrder; j++) {
        output += weights[j] * delayLine[j];
      }
      
      // Error and weight update
      const error = frame[i] - output;
      for (let j = 0; j < filterOrder; j++) {
        weights[j] += mu * error * delayLine[j];
      }
      
      filtered[i] = output;
    }
    
    return filtered;
  }
  
  applyVoiceEnhancement(frame) {
    let enhanced = new Float32Array(frame);
    
    // Pre-emphasis
    enhanced = this.applyPreEmphasis(enhanced);
    
    // Dynamic range compression
    enhanced = this.applyCompression(enhanced);
    
    // Spectral enhancement (EQ)
    enhanced = this.applyEqualization(enhanced);
    
    // Normalization
    if (this.config.voiceEnhancement.normalization) {
      enhanced = this.applyNormalization(enhanced);
    }
    
    return enhanced;
  }
  
  applyPreEmphasis(frame) {
    const emphasized = new Float32Array(frame.length);
    emphasized[0] = frame[0] - this.preEmphasisCoeff * this.preEmphasisState;
    
    for (let i = 1; i < frame.length; i++) {
      emphasized[i] = frame[i] - this.preEmphasisCoeff * frame[i - 1];
    }
    
    this.preEmphasisState = frame[frame.length - 1];
    return emphasized;
  }
  
  applyCompression(frame) {
    const compressed = new Float32Array(frame.length);
    const threshold = this.compressionState.threshold;
    const ratio = this.compressionState.ratio;
    const attack = this.compressionState.attack;
    const release = this.compressionState.release;
    
    for (let i = 0; i < frame.length; i++) {
      const input = Math.abs(frame[i]);
      
      // Envelope follower
      if (input > this.compressionState.envelope) {
        this.compressionState.envelope = attack * this.compressionState.envelope + 
                                        (1 - attack) * input;
      } else {
        this.compressionState.envelope = release * this.compressionState.envelope + 
                                        (1 - release) * input;
      }
      
      // Compression
      let gain = 1;
      if (this.compressionState.envelope > threshold) {
        const excess = this.compressionState.envelope - threshold;
        const compressedExcess = excess / ratio;
        gain = (threshold + compressedExcess) / this.compressionState.envelope;
      }
      
      compressed[i] = frame[i] * gain;
    }
    
    return compressed;
  }
  
  applyEqualization(frame) {
    // Simple frequency domain EQ
    const spectrum = this.computeComplexSpectrum(frame);
    
    // Apply EQ bands
    for (const band of this.equalizerBands) {
      const binIndex = Math.floor(band.freq * this.frameSize / this.sampleRate);
      const gain = Math.pow(10, band.gain / 20); // Convert dB to linear
      
      // Apply gain with Q factor consideration
      const bandwidth = band.freq / band.q;
      const startBin = Math.max(0, Math.floor((band.freq - bandwidth) * this.frameSize / this.sampleRate));
      const endBin = Math.min(spectrum.length / 2, Math.floor((band.freq + bandwidth) * this.frameSize / this.sampleRate));
      
      for (let i = startBin; i < endBin; i++) {
        const distance = Math.abs(i - binIndex);
        const weight = Math.exp(-distance * distance / (bandwidth * bandwidth));
        const effectiveGain = 1 + weight * (gain - 1);
        
        spectrum[i * 2] *= effectiveGain;     // Real part
        spectrum[i * 2 + 1] *= effectiveGain; // Imaginary part
      }
    }
    
    return this.complexSpectrumToTimeDomain(spectrum);
  }
  
  applyNormalization(frame) {
    const peak = Math.max(...frame.map(Math.abs));
    const targetPeak = 0.9;
    
    if (peak > 0) {
      const gain = targetPeak / peak;
      return frame.map(sample => sample * gain);
    }
    
    return frame;
  }
  
  // FFT and spectral processing utilities
  computeMagnitudeSpectrum(frame) {
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
  
  computeComplexSpectrum(frame) {
    const spectrum = new Float32Array(frame.length * 2); // Real and imaginary interleaved
    
    for (let k = 0; k < frame.length; k++) {
      let real = 0, imag = 0;
      
      for (let n = 0; n < frame.length; n++) {
        const angle = -2 * Math.PI * k * n / frame.length;
        real += frame[n] * Math.cos(angle);
        imag += frame[n] * Math.sin(angle);
      }
      
      spectrum[k * 2] = real;
      spectrum[k * 2 + 1] = imag;
    }
    
    return spectrum;
  }
  
  spectrumToTimeDomain(magnitudeSpectrum, frameLength) {
    const timeDomain = new Float32Array(frameLength);
    
    for (let n = 0; n < frameLength; n++) {
      let sum = 0;
      
      for (let k = 0; k < magnitudeSpectrum.length; k++) {
        const angle = 2 * Math.PI * k * n / frameLength;
        sum += magnitudeSpectrum[k] * Math.cos(angle);
      }
      
      timeDomain[n] = sum / frameLength;
    }
    
    return timeDomain;
  }
  
  complexSpectrumToTimeDomain(complexSpectrum) {
    const frameLength = complexSpectrum.length / 2;
    const timeDomain = new Float32Array(frameLength);
    
    for (let n = 0; n < frameLength; n++) {
      let sum = 0;
      
      for (let k = 0; k < frameLength; k++) {
        const real = complexSpectrum[k * 2];
        const imag = complexSpectrum[k * 2 + 1];
        const angle = 2 * Math.PI * k * n / frameLength;
        sum += real * Math.cos(angle) - imag * Math.sin(angle);
      }
      
      timeDomain[n] = sum / frameLength;
    }
    
    return timeDomain;
  }
  
  createHammingWindow(size) {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (size - 1));
    }
    return window;
  }
  
  // Buffer management
  shiftBuffer() {
    const shift = this.frameSize - this.hopSize;
    for (let i = 0; i < shift; i++) {
      this.inputBuffer[i] = this.inputBuffer[i + this.hopSize];
    }
    this.bufferIndex = shift;
  }
  
  overlapAddOutput(enhancedFrame, outputData, startIndex) {
    for (let i = 0; i < Math.min(enhancedFrame.length, outputData.length - startIndex); i++) {
      if (startIndex + i >= 0 && startIndex + i < outputData.length) {
        outputData[startIndex + i] += enhancedFrame[i];
      }
    }
  }
  
  copyRemainingOutput(outputData) {
    // Copy any remaining output from internal buffers
    for (let i = 0; i < Math.min(this.outputBuffer.length, outputData.length); i++) {
      outputData[i] = this.outputBuffer[i];
    }
  }
  
  // Noise profile management
  updateNoiseProfile(noiseData) {
    if (noiseData && noiseData.spectrum) {
      this.noiseProfile.spectrum.set(noiseData.spectrum);
      this.noiseProfile.energy = noiseData.energy || 0.001;
      this.noiseProfile.isValid = true;
      
      this.port.postMessage({
        type: 'noise_profile_updated',
        data: {
          energy: this.noiseProfile.energy,
          isValid: this.noiseProfile.isValid
        }
      });
    }
  }
  
  // Performance tracking
  updatePerformanceMetrics(processingTime) {
    this.processingTimes.push(processingTime);
    
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    
    // Send performance update every 50 frames
    if (this.frameCounter % 50 === 0) {
      const avgTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      const maxTime = Math.max(...this.processingTimes);
      
      this.port.postMessage({
        type: 'performance',
        data: {
          avgProcessingTime: avgTime,
          maxProcessingTime: maxTime,
          framesProcessed: this.frameCounter,
          isRealTime: avgTime < (this.frameSize / this.sampleRate) * 1000
        }
      });
    }
    
    this.frameCounter++;
  }
  
  // Message handling from main thread
  handleMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'update_config':
        this.config = { ...this.config, ...data };
        break;
        
      case 'update_noise_profile':
        this.updateNoiseProfile(data);
        break;
        
      case 'calibrate':
        this.calibrateEnhancement(data);
        break;
        
      case 'reset':
        this.resetProcessor();
        break;
    }
  }
  
  calibrateEnhancement(calibrationData) {
    // Calibrate enhancement parameters based on environment
    if (calibrationData.noiseLevel) {
      this.spectralSubtraction.alpha = Math.min(3.0, 1.5 + calibrationData.noiseLevel);
    }
    
    if (calibrationData.speechLevel) {
      this.compressionState.threshold = Math.max(0.3, calibrationData.speechLevel * 0.8);
    }
    
    this.port.postMessage({
      type: 'calibration_complete',
      data: {
        alpha: this.spectralSubtraction.alpha,
        threshold: this.compressionState.threshold
      }
    });
  }
  
  resetProcessor() {
    // Reset all processing state
    this.inputBuffer.fill(0);
    this.outputBuffer.fill(0);
    this.overlapBuffer.fill(0);
    this.bufferIndex = 0;
    this.frameCounter = 0;
    this.preEmphasisState = 0;
    this.compressionState.envelope = 0;
    
    this.port.postMessage({
      type: 'reset_complete'
    });
  }
}

// Set up message handling
AudioEnhancementProcessor.prototype.port.onmessage = AudioEnhancementProcessor.prototype.handleMessage;

// Register the processor
registerProcessor('audio-enhancement-processor', AudioEnhancementProcessor);