/**
 * MicroWakeWord Service for "Hey Pam" Detection
 *
 * Uses a custom-trained TFLite model (MixedNet architecture) for offline wake word detection.
 * This replaces the flaky Web Speech API with a purpose-built wake word model.
 *
 * Architecture:
 * - Audio capture via AudioContext (16kHz, mono)
 * - Mel-frequency spectrogram extraction (40 features, 10ms stride)
 * - TFLite model inference via @tensorflow/tfjs-tflite
 * - Detection threshold crossing triggers callback
 *
 * Benefits over Web Speech API:
 * - 100% offline (no internet required)
 * - Survives tab blur/focus changes
 * - Trained specifically for "Hey Pam"
 * - Predictable, consistent behavior
 */

import { logger } from '@/lib/logger';

// TensorFlow modules loaded dynamically to avoid Vite bundling issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tflite: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tf: any = null;

// Configuration matching training parameters
const WAKE_WORD_CONFIG = {
  sampleRate: 16000,
  numMelFeatures: 40,
  frameStrideMs: 10,
  frameLengthMs: 25,
  detectionThreshold: 0.85,
  modelPath: '/models/hey_pam/hey_pam.tflite',
  // Rolling buffer for streaming inference
  bufferDurationMs: 1500,
  // Debounce to prevent rapid re-triggering
  debounceMs: 2000,
} as const;

export type WakeWordCallback = () => void;

export interface WakeWordOptions {
  onWakeWordDetected: WakeWordCallback;
  onError?: (error: string) => void;
  onStatusChange?: (listening: boolean) => void;
  sensitivity?: number; // 0-1, maps to detection threshold (1 = most sensitive)
}

class MicroWakeWordService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model: any = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isListening: boolean = false;
  private options: WakeWordOptions | null = null;
  private lastDetectionTime: number = 0;
  private audioBuffer: Float32Array[] = [];
  private modelLoaded: boolean = false;
  private modelLoadingPromise: Promise<void> | null = null;

  // Mel filter bank for spectrogram extraction
  private melFilterBank: Float32Array[] | null = null;
  private fftSize: number = 512;

  /**
   * Check if microWakeWord detection is supported in this browser
   */
  public isSupported(): boolean {
    return (
      typeof AudioContext !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof WebAssembly !== 'undefined'
    );
  }

  /**
   * Preload the wake word model (call early to reduce latency on first use)
   */
  public async preloadModel(): Promise<void> {
    if (this.modelLoadingPromise) {
      return this.modelLoadingPromise;
    }

    this.modelLoadingPromise = this.loadModel();
    return this.modelLoadingPromise;
  }

  /**
   * Load the TFLite model
   */
  private async loadModel(): Promise<void> {
    if (this.modelLoaded) return;

    try {
      logger.info('[MicroWakeWord] Loading Hey Pam TFLite model...');

      // Dynamic imports to avoid Vite bundling issues with tfjs-tflite
      // These packages have internal module paths that don't resolve correctly in Rollup
      if (!tf) {
        logger.info('[MicroWakeWord] Loading TensorFlow.js...');
        tf = await import('@tensorflow/tfjs');
      }
      if (!tflite) {
        logger.info('[MicroWakeWord] Loading TFLite runtime...');
        tflite = await import('@tensorflow/tfjs-tflite');
      }

      // Load TFLite model directly using the official runtime
      this.model = await tflite.loadTFLiteModel(WAKE_WORD_CONFIG.modelPath);

      // Initialize mel filter bank
      this.initMelFilterBank();

      this.modelLoaded = true;
      logger.info('[MicroWakeWord] Hey Pam model loaded successfully');
    } catch (error) {
      logger.warn('[MicroWakeWord] Model not found - falling back to Web Speech API');
      logger.warn(`[MicroWakeWord] Place TFLite model at: public${WAKE_WORD_CONFIG.modelPath}`);
      throw error;
    }
  }

  /**
   * Initialize mel filter bank for spectrogram extraction
   */
  private initMelFilterBank(): void {
    const numFilters = WAKE_WORD_CONFIG.numMelFeatures;
    const sampleRate = WAKE_WORD_CONFIG.sampleRate;
    const fftBins = this.fftSize / 2 + 1;

    // Convert Hz to Mel scale
    const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
    const melToHz = (mel: number) => 700 * (Math.pow(10, mel / 2595) - 1);

    const lowFreqMel = hzToMel(0);
    const highFreqMel = hzToMel(sampleRate / 2);

    // Mel points evenly spaced between low and high
    const melPoints: number[] = [];
    for (let i = 0; i < numFilters + 2; i++) {
      melPoints.push(lowFreqMel + (i * (highFreqMel - lowFreqMel)) / (numFilters + 1));
    }

    // Convert mel points to Hz and then to FFT bin indices
    const binPoints = melPoints.map(mel => {
      const hz = melToHz(mel);
      return Math.floor(((this.fftSize + 1) * hz) / sampleRate);
    });

    // Create triangular filters
    this.melFilterBank = [];
    for (let i = 0; i < numFilters; i++) {
      const filter = new Float32Array(fftBins);
      const start = binPoints[i];
      const center = binPoints[i + 1];
      const end = binPoints[i + 2];

      for (let j = start; j < center; j++) {
        filter[j] = (j - start) / (center - start);
      }
      for (let j = center; j < end; j++) {
        filter[j] = (end - j) / (end - center);
      }

      this.melFilterBank.push(filter);
    }
  }

  /**
   * Start listening for wake word
   */
  public async start(options: WakeWordOptions): Promise<void> {
    if (!this.isSupported()) {
      const error = 'MicroWakeWord not supported in this browser';
      logger.error(error);
      options.onError?.(error);
      throw new Error(error);
    }

    if (this.isListening) {
      logger.warn('[MicroWakeWord] Already listening');
      return;
    }

    this.options = options;
    this.audioBuffer = [];

    try {
      // Load model if not already loaded
      await this.loadModel();

      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: WAKE_WORD_CONFIG.sampleRate,
          channelCount: 1,
        },
      });

      // Create audio context at 16kHz
      this.audioContext = new AudioContext({
        sampleRate: WAKE_WORD_CONFIG.sampleRate,
      });

      // Create source from microphone
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Use ScriptProcessor for audio capture
      const bufferSize = 4096;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isListening) return;

        const inputData = e.inputBuffer.getChannelData(0);
        this.processAudioFrame(new Float32Array(inputData));
      };

      source.connect(this.processorNode);
      // Connect to destination with zero gain to keep processor active
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      this.processorNode.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      this.isListening = true;
      this.options?.onStatusChange?.(true);
      logger.info('[MicroWakeWord] Listening for "Hey Pam" (TFLite model)');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[MicroWakeWord] Failed to start: ${errorMsg}`);
      this.options?.onError?.(errorMsg);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Process incoming audio frame
   */
  private processAudioFrame(samples: Float32Array): void {
    // Add to rolling buffer
    this.audioBuffer.push(samples);

    // Keep buffer at appropriate size for streaming inference
    const samplesPerFrame = Math.floor(
      (WAKE_WORD_CONFIG.frameStrideMs * WAKE_WORD_CONFIG.sampleRate) / 1000
    );
    const maxFrames = Math.ceil(
      (WAKE_WORD_CONFIG.bufferDurationMs * WAKE_WORD_CONFIG.sampleRate) / 1000 / samplesPerFrame
    );

    while (this.audioBuffer.length > maxFrames) {
      this.audioBuffer.shift();
    }

    // Run inference when we have enough data
    if (this.audioBuffer.length >= 10) {
      this.runInference();
    }
  }

  /**
   * Extract mel spectrogram from audio buffer
   */
  private extractMelSpectrogram(): Float32Array[] {
    // Flatten audio buffer
    const totalSamples = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
    const audioData = new Float32Array(totalSamples);
    let offset = 0;
    for (const buf of this.audioBuffer) {
      audioData.set(buf, offset);
      offset += buf.length;
    }

    const frameLength = Math.floor(
      (WAKE_WORD_CONFIG.frameLengthMs * WAKE_WORD_CONFIG.sampleRate) / 1000
    );
    const frameStride = Math.floor(
      (WAKE_WORD_CONFIG.frameStrideMs * WAKE_WORD_CONFIG.sampleRate) / 1000
    );

    const frames: Float32Array[] = [];

    for (let i = 0; i + frameLength <= audioData.length; i += frameStride) {
      const frame = audioData.slice(i, i + frameLength);

      // Apply Hamming window
      const windowed = new Float32Array(this.fftSize);
      for (let j = 0; j < frame.length; j++) {
        windowed[j] = frame[j] * (0.54 - 0.46 * Math.cos((2 * Math.PI * j) / (frame.length - 1)));
      }

      // Compute FFT magnitude spectrum
      const magnitude = this.computeFFTMagnitude(windowed);

      // Apply mel filter bank
      if (this.melFilterBank) {
        const melEnergies = new Float32Array(WAKE_WORD_CONFIG.numMelFeatures);
        for (let m = 0; m < this.melFilterBank.length; m++) {
          let energy = 0;
          for (let k = 0; k < magnitude.length; k++) {
            energy += magnitude[k] * this.melFilterBank[m][k];
          }
          // Log compression
          melEnergies[m] = Math.log(Math.max(energy, 1e-10));
        }
        frames.push(melEnergies);
      }
    }

    return frames;
  }

  /**
   * Compute FFT magnitude spectrum (simplified implementation)
   */
  private computeFFTMagnitude(signal: Float32Array): Float32Array {
    const n = signal.length;
    const magnitude = new Float32Array(n / 2 + 1);

    // Naive DFT - adequate for small FFT sizes
    for (let k = 0; k <= n / 2; k++) {
      let real = 0;
      let imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / n;
        real += signal[t] * Math.cos(angle);
        imag -= signal[t] * Math.sin(angle);
      }
      magnitude[k] = Math.sqrt(real * real + imag * imag);
    }

    return magnitude;
  }

  /**
   * Run model inference on current audio buffer
   */
  private async runInference(): Promise<void> {
    if (!this.model || !this.isListening) return;

    try {
      // Extract mel spectrogram
      const spectrogram = this.extractMelSpectrogram();

      if (spectrogram.length < 10) return;

      // Prepare input data [batch, time, features]
      const inputData = new Float32Array(spectrogram.length * WAKE_WORD_CONFIG.numMelFeatures);
      for (let t = 0; t < spectrogram.length; t++) {
        for (let f = 0; f < WAKE_WORD_CONFIG.numMelFeatures; f++) {
          inputData[t * WAKE_WORD_CONFIG.numMelFeatures + f] = spectrogram[t][f];
        }
      }

      // Create tensor from input data
      // Shape: [batch, time, features] = [1, numFrames, 40]
      const inputTensor = tf.tensor3d(
        inputData,
        [1, spectrogram.length, WAKE_WORD_CONFIG.numMelFeatures]
      );

      // Run TFLite inference
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output = this.model.predict(inputTensor) as any;

      // Get prediction from output tensor
      const prediction = await output.data();
      const confidence = prediction[0] || 0;

      // Cleanup tensors
      inputTensor.dispose();
      output.dispose();

      // Check if wake word detected
      const threshold = this.options?.sensitivity
        ? 1 - this.options.sensitivity * 0.3 // Map sensitivity to threshold
        : WAKE_WORD_CONFIG.detectionThreshold;

      if (confidence > threshold) {
        // Debounce
        const now = Date.now();
        if (now - this.lastDetectionTime < WAKE_WORD_CONFIG.debounceMs) {
          logger.debug(`[MicroWakeWord] Debounced (${now - this.lastDetectionTime}ms since last)`);
          return;
        }

        this.lastDetectionTime = now;
        logger.info(`[MicroWakeWord] "Hey Pam" detected! (confidence: ${confidence.toFixed(3)})`);
        this.options?.onWakeWordDetected();
      }
    } catch (error) {
      logger.error('[MicroWakeWord] Inference error:', error);
    }
  }

  /**
   * Stop listening for wake word
   */
  public stop(): void {
    this.isListening = false;
    this.cleanup();
    this.options?.onStatusChange?.(false);
    logger.info('[MicroWakeWord] Stopped listening');
  }

  /**
   * Get current listening status
   */
  public getStatus(): boolean {
    return this.isListening;
  }

  /**
   * Check if model is loaded
   */
  public isModelLoaded(): boolean {
    return this.modelLoaded;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioBuffer = [];
  }
}

// Export singleton instance
export const microWakeWordService = new MicroWakeWordService();

// Export legacy-compatible interface
export default microWakeWordService;
