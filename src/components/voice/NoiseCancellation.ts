/**
 * Real-time Noise Cancellation System
 * Implements spectral subtraction and adaptive filtering for clean audio
 */

interface NoiseReductionConfig {
  fftSize: number;
  overlapFactor: number;
  noiseFloorMultiplier: number;
  maxNoiseReduction: number;
  smoothingFactor: number;
  lookAhead: number;
}

export class NoiseCancellation {
  private config: NoiseReductionConfig;
  private audioContext: AudioContext;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  
  // Noise profiling
  private noiseProfile: Float32Array | null = null;
  private isProfilingNoise = false;
  private noiseFrames: Float32Array[] = [];
  private smoothedSpectrum: Float32Array | null = null;
  
  // Processing buffers
  private inputBuffer: Float32Array;
  private outputBuffer: Float32Array;
  private window: Float32Array;
  private fftBuffer: Float32Array;
  private ifftBuffer: Float32Array;
  
  // Real-time processing
  private frameCount = 0;
  private overlapBuffer: Float32Array;

  constructor(audioContext: AudioContext, config: Partial<NoiseReductionConfig> = {}) {
    this.audioContext = audioContext;
    this.config = {
      fftSize: 2048,
      overlapFactor: 4,
      noiseFloorMultiplier: 2.0,
      maxNoiseReduction: 20, // dB
      smoothingFactor: 0.98,
      lookAhead: 3,
      ...config
    };

    this.inputBuffer = new Float32Array(this.config.fftSize);
    this.outputBuffer = new Float32Array(this.config.fftSize);
    this.fftBuffer = new Float32Array(this.config.fftSize * 2);
    this.ifftBuffer = new Float32Array(this.config.fftSize * 2);
    this.overlapBuffer = new Float32Array(this.config.fftSize);
    
    // Create Hann window
    this.window = this.createHannWindow(this.config.fftSize);
  }

  async start(inputStream: MediaStream): Promise<MediaStream> {
    console.log('🔇 Starting noise cancellation...');
    
    this.source = this.audioContext.createMediaStreamSource(inputStream);
    this.destination = this.audioContext.createMediaStreamDestination();
    
    // Create script processor for real-time processing
    this.scriptProcessor = this.audioContext.createScriptProcessor(
      this.config.fftSize / this.config.overlapFactor, 1, 1
    );
    
    this.scriptProcessor.onaudioprocess = (event) => {
      this.processAudioFrame(event.inputBuffer, event.outputBuffer);
    };
    
    // Connect audio graph
    this.source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.destination);
    
    // Start noise profiling
    this.startNoiseProfiler();
    
    return this.destination.stream;
  }

  stop(): void {
    console.log('🛑 Stopping noise cancellation...');
    
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    this.destination = null;
  }

  private processAudioFrame(inputBuffer: AudioBuffer, outputBuffer: AudioBuffer): void {
    const input = inputBuffer.getChannelData(0);
    const output = outputBuffer.getChannelData(0);
    
    // Copy input to processing buffer
    const hopSize = this.config.fftSize / this.config.overlapFactor;
    
    // Shift existing data
    for (let i = 0; i < this.config.fftSize - hopSize; i++) {
      this.inputBuffer[i] = this.inputBuffer[i + hopSize];
    }
    
    // Add new data
    for (let i = 0; i < hopSize; i++) {
      this.inputBuffer[this.config.fftSize - hopSize + i] = input[i];
    }
    
    // Apply noise reduction if we have a noise profile
    if (this.noiseProfile) {
      this.spectralSubtraction();
    } else {
      // Pass through if no noise profile yet
      this.outputBuffer.set(this.inputBuffer);
    }
    
    // Overlap-add output
    for (let i = 0; i < hopSize; i++) {
      output[i] = this.outputBuffer[i] + this.overlapBuffer[i];
      this.overlapBuffer[i] = this.outputBuffer[i + hopSize];
    }
    
    this.frameCount++;
  }

  private spectralSubtraction(): void {
    // Apply window
    for (let i = 0; i < this.config.fftSize; i++) {
      this.fftBuffer[i * 2] = this.inputBuffer[i] * this.window[i];
      this.fftBuffer[i * 2 + 1] = 0;
    }
    
    // Forward FFT
    this.fft(this.fftBuffer);
    
    // Calculate magnitude spectrum
    const magnitude = new Float32Array(this.config.fftSize / 2);
    const phase = new Float32Array(this.config.fftSize / 2);
    
    for (let i = 0; i < this.config.fftSize / 2; i++) {
      const real = this.fftBuffer[i * 2];
      const imag = this.fftBuffer[i * 2 + 1];
      magnitude[i] = Math.sqrt(real * real + imag * imag);
      phase[i] = Math.atan2(imag, real);
    }
    
    // Apply spectral subtraction
    for (let i = 0; i < this.config.fftSize / 2; i++) {
      const noiseLevel = this.noiseProfile![i] * this.config.noiseFloorMultiplier;
      const snr = magnitude[i] / (noiseLevel + 1e-10);
      
      // Wiener filter approach
      let gain = Math.max(0.1, (snr - 1) / snr);
      
      // Limit maximum noise reduction
      const maxGainReduction = Math.pow(10, -this.config.maxNoiseReduction / 20);
      gain = Math.max(gain, maxGainReduction);
      
      // Smooth gain changes
      if (this.smoothedSpectrum) {
        gain = this.smoothedSpectrum[i] * this.config.smoothingFactor + 
               gain * (1 - this.config.smoothingFactor);
      }
      
      magnitude[i] *= gain;
      
      // Store smoothed spectrum
      if (!this.smoothedSpectrum) {
        this.smoothedSpectrum = new Float32Array(this.config.fftSize / 2);
      }
      this.smoothedSpectrum[i] = gain;
    }
    
    // Reconstruct complex spectrum
    for (let i = 0; i < this.config.fftSize / 2; i++) {
      this.ifftBuffer[i * 2] = magnitude[i] * Math.cos(phase[i]);
      this.ifftBuffer[i * 2 + 1] = magnitude[i] * Math.sin(phase[i]);
    }
    
    // Mirror for real IFFT
    for (let i = 1; i < this.config.fftSize / 2; i++) {
      const srcIdx = (this.config.fftSize / 2 - i) * 2;
      const dstIdx = (this.config.fftSize / 2 + i) * 2;
      this.ifftBuffer[dstIdx] = this.ifftBuffer[srcIdx];
      this.ifftBuffer[dstIdx + 1] = -this.ifftBuffer[srcIdx + 1];
    }
    
    // Inverse FFT
    this.ifft(this.ifftBuffer);
    
    // Apply window and store result
    for (let i = 0; i < this.config.fftSize; i++) {
      this.outputBuffer[i] = this.ifftBuffer[i * 2] * this.window[i];
    }
  }

  private startNoiseProfiler(): void {
    console.log('🎛️ Starting noise profiling for 2 seconds...');
    this.isProfilingNoise = true;
    this.noiseFrames = [];
    
    setTimeout(() => {
      this.finishNoiseProfiler();
    }, 2000);
  }

  private finishNoiseProfiler(): void {
    if (this.noiseFrames.length === 0) {
      console.warn('⚠️ No noise frames collected, retrying...');
      setTimeout(() => this.startNoiseProfiler(), 1000);
      return;
    }
    
    console.log(`🎛️ Building noise profile from ${this.noiseFrames.length} frames...`);
    
    // Average the noise frames to create profile
    this.noiseProfile = new Float32Array(this.config.fftSize / 2);
    
    for (const frame of this.noiseFrames) {
      // Convert to frequency domain
      const fftFrame = new Float32Array(this.config.fftSize * 2);
      for (let i = 0; i < this.config.fftSize; i++) {
        fftFrame[i * 2] = frame[i] * this.window[i];
        fftFrame[i * 2 + 1] = 0;
      }
      
      this.fft(fftFrame);
      
      // Add magnitude to profile
      for (let i = 0; i < this.config.fftSize / 2; i++) {
        const real = fftFrame[i * 2];
        const imag = fftFrame[i * 2 + 1];
        const magnitude = Math.sqrt(real * real + imag * imag);
        this.noiseProfile[i] += magnitude / this.noiseFrames.length;
      }
    }
    
    this.isProfilingNoise = false;
    console.log('✅ Noise profile created, noise cancellation active');
  }

  private createHannWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
    }
    return window;
  }

  // Simple radix-2 FFT implementation
  private fft(buffer: Float32Array): void {
    const n = buffer.length / 2;
    
    // Bit-reversal permutation
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) {
        j ^= bit;
      }
      j ^= bit;
      
      if (i < j) {
        [buffer[i * 2], buffer[j * 2]] = [buffer[j * 2], buffer[i * 2]];
        [buffer[i * 2 + 1], buffer[j * 2 + 1]] = [buffer[j * 2 + 1], buffer[i * 2 + 1]];
      }
    }
    
    // Cooley-Tukey FFT
    for (let length = 2; length <= n; length <<= 1) {
      const angle = 2 * Math.PI / length;
      const wlen = { real: Math.cos(angle), imag: Math.sin(angle) };
      
      for (let i = 0; i < n; i += length) {
        const w = { real: 1, imag: 0 };
        
        for (let j = 0; j < length / 2; j++) {
          const u_idx = (i + j) * 2;
          const v_idx = (i + j + length / 2) * 2;
          
          const u_real = buffer[u_idx];
          const u_imag = buffer[u_idx + 1];
          const v_real = buffer[v_idx];
          const v_imag = buffer[v_idx + 1];
          
          const w_real = Math.cos(-angle * j);
          const w_imag = Math.sin(-angle * j);
          
          const temp_real = v_real * w_real - v_imag * w_imag;
          const temp_imag = v_real * w_imag + v_imag * w_real;
          
          buffer[u_idx] = u_real + temp_real;
          buffer[u_idx + 1] = u_imag + temp_imag;
          buffer[v_idx] = u_real - temp_real;
          buffer[v_idx + 1] = u_imag - temp_imag;
        }
      }
    }
  }

  private ifft(buffer: Float32Array): void {
    // Conjugate
    for (let i = 1; i < buffer.length; i += 2) {
      buffer[i] = -buffer[i];
    }
    
    // Forward FFT
    this.fft(buffer);
    
    // Conjugate and scale
    const n = buffer.length / 2;
    for (let i = 0; i < buffer.length; i += 2) {
      buffer[i] /= n;
      buffer[i + 1] = -buffer[i + 1] / n;
    }
  }

  // Public API
  forceNoiseProfileUpdate(): void {
    console.log('🔄 Forcing noise profile update...');
    this.startNoiseProfiler();
  }

  getNoiseProfile(): Float32Array | null {
    return this.noiseProfile ? new Float32Array(this.noiseProfile) : null;
  }

  isProfiled(): boolean {
    return this.noiseProfile !== null;
  }
}