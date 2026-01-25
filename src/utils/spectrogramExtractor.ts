/**
 * Spectrogram Extractor for Wake Word Detection
 *
 * Extracts mel-frequency spectrograms from audio data matching the
 * microWakeWord training configuration.
 *
 * Parameters (matching hey_pam.json training config):
 * - 40 mel-frequency features
 * - 16kHz sample rate
 * - 10ms frame stride
 * - 25ms frame length
 */

export interface SpectrogramConfig {
  sampleRate: number;
  numMelFeatures: number;
  frameLengthMs: number;
  frameStrideMs: number;
  fftSize: number;
}

export const DEFAULT_CONFIG: SpectrogramConfig = {
  sampleRate: 16000,
  numMelFeatures: 40,
  frameLengthMs: 25,
  frameStrideMs: 10,
  fftSize: 512,
};

/**
 * Create mel filter bank for converting FFT to mel-scale energies
 */
export function createMelFilterBank(
  numFilters: number,
  fftSize: number,
  sampleRate: number
): Float32Array[] {
  const fftBins = fftSize / 2 + 1;

  // Mel scale conversion functions
  const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
  const melToHz = (mel: number) => 700 * (Math.pow(10, mel / 2595) - 1);

  const lowFreqMel = hzToMel(0);
  const highFreqMel = hzToMel(sampleRate / 2);

  // Create evenly-spaced mel points
  const melPoints: number[] = [];
  for (let i = 0; i < numFilters + 2; i++) {
    melPoints.push(lowFreqMel + (i * (highFreqMel - lowFreqMel)) / (numFilters + 1));
  }

  // Convert mel points to FFT bin indices
  const binPoints = melPoints.map(mel => {
    const hz = melToHz(mel);
    return Math.floor(((fftSize + 1) * hz) / sampleRate);
  });

  // Create triangular filters
  const filterBank: Float32Array[] = [];
  for (let i = 0; i < numFilters; i++) {
    const filter = new Float32Array(fftBins);
    const start = binPoints[i];
    const center = binPoints[i + 1];
    const end = binPoints[i + 2];

    // Rising edge
    for (let j = start; j < center; j++) {
      filter[j] = (j - start) / (center - start);
    }
    // Falling edge
    for (let j = center; j < end; j++) {
      filter[j] = (end - j) / (end - center);
    }

    filterBank.push(filter);
  }

  return filterBank;
}

/**
 * Apply Hamming window to a signal frame
 */
export function applyHammingWindow(frame: Float32Array, outputSize: number): Float32Array {
  const windowed = new Float32Array(outputSize);
  const N = frame.length;

  for (let i = 0; i < N; i++) {
    windowed[i] = frame[i] * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1)));
  }

  return windowed;
}

/**
 * Compute FFT magnitude spectrum (real-valued input)
 *
 * Note: This is a naive DFT implementation for simplicity.
 * For production, use a proper FFT library like fft.js or dsp.js.
 */
export function computeFFTMagnitude(signal: Float32Array): Float32Array {
  const n = signal.length;
  const magnitude = new Float32Array(n / 2 + 1);

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
 * Apply mel filter bank to FFT magnitude spectrum
 */
export function applyMelFilterBank(
  magnitude: Float32Array,
  filterBank: Float32Array[]
): Float32Array {
  const melEnergies = new Float32Array(filterBank.length);

  for (let m = 0; m < filterBank.length; m++) {
    let energy = 0;
    for (let k = 0; k < magnitude.length; k++) {
      energy += magnitude[k] * filterBank[m][k];
    }
    // Log compression to match human perception
    melEnergies[m] = Math.log(Math.max(energy, 1e-10));
  }

  return melEnergies;
}

/**
 * Extract mel spectrogram from audio samples
 */
export function extractMelSpectrogram(
  audioData: Float32Array,
  config: SpectrogramConfig = DEFAULT_CONFIG,
  filterBank?: Float32Array[]
): Float32Array[] {
  const frameLength = Math.floor((config.frameLengthMs * config.sampleRate) / 1000);
  const frameStride = Math.floor((config.frameStrideMs * config.sampleRate) / 1000);

  // Create filter bank if not provided
  const melFilterBank = filterBank || createMelFilterBank(
    config.numMelFeatures,
    config.fftSize,
    config.sampleRate
  );

  const frames: Float32Array[] = [];

  for (let i = 0; i + frameLength <= audioData.length; i += frameStride) {
    // Extract frame
    const frame = audioData.slice(i, i + frameLength);

    // Apply Hamming window
    const windowed = applyHammingWindow(frame, config.fftSize);

    // Compute FFT magnitude
    const magnitude = computeFFTMagnitude(windowed);

    // Apply mel filter bank
    const melEnergies = applyMelFilterBank(magnitude, melFilterBank);

    frames.push(melEnergies);
  }

  return frames;
}

/**
 * Convert spectrogram frames to flat tensor for model input
 */
export function spectrogramToTensor(
  frames: Float32Array[],
  numFeatures: number
): Float32Array {
  const tensorData = new Float32Array(frames.length * numFeatures);

  for (let t = 0; t < frames.length; t++) {
    for (let f = 0; f < numFeatures; f++) {
      tensorData[t * numFeatures + f] = frames[t][f];
    }
  }

  return tensorData;
}

/**
 * Normalize spectrogram for model input (mean/std normalization)
 */
export function normalizeSpectrogram(frames: Float32Array[]): Float32Array[] {
  // Calculate global mean and std
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (const frame of frames) {
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i];
      sumSq += frame[i] * frame[i];
      count++;
    }
  }

  const mean = sum / count;
  const std = Math.sqrt(sumSq / count - mean * mean);

  // Normalize each frame
  return frames.map(frame => {
    const normalized = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      normalized[i] = (frame[i] - mean) / (std + 1e-8);
    }
    return normalized;
  });
}
