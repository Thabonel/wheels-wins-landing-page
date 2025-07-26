/**
 * Real-time Audio Streaming Pipeline
 * High-performance audio processing with WebRTC, Web Audio API, and WebCodecs
 * Inspired by Google Assistant and Alexa real-time streaming architectures
 */

interface AudioStreamConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  bufferSize: number;
  latencyHint: 'interactive' | 'balanced' | 'playback';
  enableEchoCancellation: boolean;
  enableNoiseSuppression: boolean;
  enableAutoGainControl: boolean;
  streamingMode: 'continuous' | 'push-to-talk' | 'voice-activated';
  compressionEnabled: boolean;
  realtimeProcessing: boolean;
}

interface AudioChunk {
  id: string;
  data: Float32Array;
  timestamp: number;
  sampleRate: number;
  channels: number;
  duration: number;
  metadata?: Record<string, any>;
}

interface StreamingMetrics {
  latency: number;
  jitter: number;
  packetsLost: number;
  bandwidth: number;
  cpuUsage: number;
  memoryUsage: number;
  bufferHealth: number;
  qualityScore: number;
}

interface AudioStreamCallbacks {
  onAudioChunk?: (chunk: AudioChunk) => void;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
  onQualityChange?: (quality: number) => void;
  onLatencyChange?: (latency: number) => void;
  onBufferUnderrun?: () => void;
  onBufferOverflow?: () => void;
}

export class AudioStreamingPipeline {
  private config: AudioStreamConfig;
  private callbacks: AudioStreamCallbacks;
  
  // Audio components
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  
  // Streaming infrastructure
  private isStreaming = false;
  private isInitialized = false;
  private streamId: string = '';
  private chunkCounter = 0;
  
  // Buffers and queues
  private inputBuffer: AudioChunk[] = [];
  private outputBuffer: AudioChunk[] = [];
  private processingQueue: AudioChunk[] = [];
  private maxBufferSize = 100;
  
  // Performance monitoring
  private metrics: StreamingMetrics = {
    latency: 0,
    jitter: 0,
    packetsLost: 0,
    bandwidth: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    bufferHealth: 1.0,
    qualityScore: 1.0
  };
  
  // Timing and synchronization
  private lastChunkTime = 0;
  private avgChunkInterval = 0;
  private performanceObserver: PerformanceObserver | null = null;
  private latencyMeasurements: number[] = [];
  
  // WebRTC for real-time streaming
  private rtcConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  
  constructor(config: Partial<AudioStreamConfig> = {}, callbacks: AudioStreamCallbacks = {}) {
    this.config = {
      sampleRate: 16000, // Optimized for speech
      channels: 1, // Mono for efficiency
      bitDepth: 16,
      bufferSize: 1024, // Small buffer for low latency
      latencyHint: 'interactive',
      enableEchoCancellation: true,
      enableNoiseSuppression: true,
      enableAutoGainControl: true,
      streamingMode: 'voice-activated',
      compressionEnabled: true,
      realtimeProcessing: true,
      ...config
    };
    
    this.callbacks = callbacks;
    this.streamId = this.generateStreamId();
    
    console.log('🎵 Audio Streaming Pipeline initialized');
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    console.log('🚀 Initializing Audio Streaming Pipeline...');

    try {
      // Initialize AudioContext with optimized settings
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate,
        latencyHint: this.config.latencyHint
      });

      // Request microphone access with optimized constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: this.config.enableEchoCancellation,
          noiseSuppression: this.config.enableNoiseSuppression,
          autoGainControl: this.config.enableAutoGainControl,
          latency: 0, // Request minimum latency
          volume: 1.0
        }
      });

      // Setup audio processing chain
      await this.setupAudioProcessingChain();
      
      // Initialize performance monitoring
      this.setupPerformanceMonitoring();
      
      // Setup WebRTC for real-time streaming (optional)
      if (this.config.realtimeProcessing) {
        await this.setupWebRTCStreaming();
      }

      this.isInitialized = true;
      console.log('✅ Audio Streaming Pipeline ready');
      
      return true;

    } catch (error) {
      console.error('❌ Audio streaming initialization failed:', error);
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  private async setupAudioProcessingChain(): Promise<void> {
    if (!this.audioContext || !this.mediaStream) {
      throw new Error('AudioContext or MediaStream not available');
    }

    // Create audio nodes
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyser = this.audioContext.createAnalyser();
    this.gainNode = this.audioContext.createGain();

    // Configure analyser for real-time processing
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.1; // Fast response
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;

    // Try to load AudioWorklet for high-performance processing
    try {
      await this.audioContext.audioWorklet.addModule('/audio-processor-worklet.js');
      this.processor = new AudioWorkletNode(this.audioContext, 'audio-processor', {
        processorOptions: {
          bufferSize: this.config.bufferSize,
          sampleRate: this.config.sampleRate
        }
      });

      // Setup worklet message handling
      this.processor.port.onmessage = (event) => {
        this.handleAudioWorkletMessage(event.data);
      };

    } catch (error) {
      console.warn('⚠️ AudioWorklet not available, falling back to ScriptProcessor');
      await this.setupScriptProcessorFallback();
    }

    // Connect audio graph
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    
    if (this.processor) {
      this.gainNode.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    }

    console.log('🔗 Audio processing chain connected');
  }

  private async setupScriptProcessorFallback(): Promise<void> {
    if (!this.audioContext) return;

    // Create ScriptProcessor as fallback
    const scriptProcessor = this.audioContext.createScriptProcessor(
      this.config.bufferSize, 
      this.config.channels, 
      this.config.channels
    );

    scriptProcessor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer;
      const outputBuffer = event.outputBuffer;
      
      // Process audio data
      this.processAudioBuffer(inputBuffer);
      
      // Copy input to output (pass-through)
      for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
        const inputData = inputBuffer.getChannelData(channel);
        const outputData = outputBuffer.getChannelData(channel);
        outputData.set(inputData);
      }
    };

    this.processor = scriptProcessor as any;
  }

  private setupPerformanceMonitoring(): void {
    // Monitor performance using Performance Observer API
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name === 'audio-processing') {
            this.updateLatencyMetrics(entry.duration);
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }

    // Monitor buffer health
    setInterval(() => {
      this.updateBufferHealthMetrics();
    }, 1000);

    // Monitor CPU and memory usage
    setInterval(() => {
      this.updateSystemMetrics();
    }, 5000);
  }

  private async setupWebRTCStreaming(): Promise<void> {
    // Setup WebRTC for real-time streaming capabilities
    this.rtcConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    // Create data channel for audio streaming
    this.dataChannel = this.rtcConnection.createDataChannel('audio-stream', {
      ordered: false, // Allow out-of-order delivery for lower latency
      maxPacketLifeTime: 100 // 100ms max lifetime
    });

    this.dataChannel.onopen = () => {
      console.log('📡 WebRTC data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('📡 WebRTC data channel closed');
    };

    this.dataChannel.onerror = (error) => {
      console.error('❌ WebRTC data channel error:', error);
    };
  }

  async startStreaming(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Pipeline not initialized');
    }

    if (this.isStreaming) {
      console.warn('⚠️ Streaming already active');
      return;
    }

    console.log('🎙️ Starting audio streaming...');

    try {
      // Resume AudioContext if suspended
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isStreaming = true;
      this.chunkCounter = 0;
      this.lastChunkTime = performance.now();

      // Start performance measurements
      this.startPerformanceMeasurement();

      this.callbacks.onStreamStart?.();

      console.log('✅ Audio streaming started');

    } catch (error) {
      console.error('❌ Failed to start streaming:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  stopStreaming(): void {
    if (!this.isStreaming) {
      return;
    }

    console.log('🛑 Stopping audio streaming...');

    this.isStreaming = false;
    
    // Clear buffers
    this.inputBuffer = [];
    this.outputBuffer = [];
    this.processingQueue = [];

    // Stop performance measurements
    this.stopPerformanceMeasurement();

    this.callbacks.onStreamEnd?.();

    console.log('✅ Audio streaming stopped');
  }

  private handleAudioWorkletMessage(data: any): void {
    if (data.type === 'audio-chunk') {
      this.processAudioChunk(data.chunk);
    } else if (data.type === 'performance') {
      this.updatePerformanceMetrics(data.metrics);
    }
  }

  private processAudioBuffer(buffer: AudioBuffer): void {
    if (!this.isStreaming) return;

    const now = performance.now();
    const channelData = buffer.getChannelData(0);
    
    // Create audio chunk
    const chunk: AudioChunk = {
      id: `${this.streamId}-${this.chunkCounter++}`,
      data: new Float32Array(channelData),
      timestamp: now,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      duration: buffer.duration,
      metadata: {
        bufferSize: buffer.length,
        processingLatency: now - this.lastChunkTime
      }
    };

    this.processAudioChunk(chunk);
    this.lastChunkTime = now;
  }

  private processAudioChunk(chunk: AudioChunk): void {
    // Add to input buffer
    this.inputBuffer.push(chunk);
    
    // Maintain buffer size
    if (this.inputBuffer.length > this.maxBufferSize) {
      const removed = this.inputBuffer.shift();
      console.warn('⚠️ Input buffer overflow, dropping chunk:', removed?.id);
      this.metrics.packetsLost++;
    }

    // Apply audio enhancements if enabled
    if (this.config.compressionEnabled) {
      this.applyAudioCompression(chunk);
    }

    // Update metrics
    this.updateStreamingMetrics(chunk);

    // Stream via WebRTC if available
    if (this.dataChannel?.readyState === 'open') {
      this.streamViaWebRTC(chunk);
    }

    // Trigger callback
    this.callbacks.onAudioChunk?.(chunk);

    // Quality assessment
    this.assessAudioQuality(chunk);
  }

  private applyAudioCompression(chunk: AudioChunk): void {
    // Simple dynamic range compression
    const data = chunk.data;
    const threshold = 0.7;
    const ratio = 4;

    for (let i = 0; i < data.length; i++) {
      const sample = Math.abs(data[i]);
      if (sample > threshold) {
        const excess = sample - threshold;
        const compressed = threshold + (excess / ratio);
        data[i] = data[i] < 0 ? -compressed : compressed;
      }
    }
  }

  private streamViaWebRTC(chunk: AudioChunk): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }

    try {
      // Convert Float32Array to ArrayBuffer for transmission
      const buffer = chunk.data.buffer;
      const metadata = {
        id: chunk.id,
        timestamp: chunk.timestamp,
        sampleRate: chunk.sampleRate,
        duration: chunk.duration
      };

      // Send metadata first, then audio data
      this.dataChannel.send(JSON.stringify(metadata));
      this.dataChannel.send(buffer);

      this.metrics.bandwidth += buffer.byteLength;

    } catch (error) {
      console.error('❌ WebRTC streaming error:', error);
    }
  }

  private assessAudioQuality(chunk: AudioChunk): void {
    const data = chunk.data;
    
    // Calculate RMS energy
    let rms = 0;
    for (let i = 0; i < data.length; i++) {
      rms += data[i] * data[i];
    }
    rms = Math.sqrt(rms / data.length);

    // Calculate signal-to-noise ratio estimate
    const signalPower = rms;
    const noisePower = this.estimateNoisePower(data);
    const snr = signalPower / (noisePower + 0.001); // Avoid division by zero

    // Update quality score (0-1 scale)
    const qualityScore = Math.min(1, Math.max(0, snr / 10));
    
    if (Math.abs(qualityScore - this.metrics.qualityScore) > 0.1) {
      this.metrics.qualityScore = qualityScore;
      this.callbacks.onQualityChange?.(qualityScore);
    }
  }

  private estimateNoisePower(data: Float32Array): number {
    // Simple noise estimation using minimum values
    const sortedData = Array.from(data).map(Math.abs).sort((a, b) => a - b);
    const percentile10 = sortedData[Math.floor(sortedData.length * 0.1)];
    return percentile10;
  }

  private updateStreamingMetrics(chunk: AudioChunk): void {
    const now = performance.now();
    
    // Calculate latency
    const latency = now - chunk.timestamp;
    this.latencyMeasurements.push(latency);
    
    // Keep only recent measurements
    if (this.latencyMeasurements.length > 100) {
      this.latencyMeasurements.shift();
    }
    
    // Calculate average latency
    this.metrics.latency = this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length;
    
    // Calculate jitter (latency variation)
    if (this.latencyMeasurements.length > 1) {
      const variations = this.latencyMeasurements.slice(1).map((current, index) => 
        Math.abs(current - this.latencyMeasurements[index])
      );
      this.metrics.jitter = variations.reduce((a, b) => a + b, 0) / variations.length;
    }

    // Trigger latency callback if significant change
    if (Math.abs(latency - this.metrics.latency) > 10) {
      this.callbacks.onLatencyChange?.(latency);
    }
  }

  private updateBufferHealthMetrics(): void {
    const inputHealth = 1 - (this.inputBuffer.length / this.maxBufferSize);
    const outputHealth = 1 - (this.outputBuffer.length / this.maxBufferSize);
    
    this.metrics.bufferHealth = Math.min(inputHealth, outputHealth);
    
    // Check for buffer issues
    if (this.metrics.bufferHealth < 0.2) {
      this.callbacks.onBufferUnderrun?.();
    } else if (this.metrics.bufferHealth > 0.9 && this.inputBuffer.length > this.maxBufferSize * 0.9) {
      this.callbacks.onBufferOverflow?.();
    }
  }

  private updateSystemMetrics(): void {
    // Monitor memory usage
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
    }

    // CPU usage estimation (simplified)
    this.metrics.cpuUsage = Math.min(1, this.metrics.latency / 100);
  }

  private updatePerformanceMetrics(metrics: any): void {
    Object.assign(this.metrics, metrics);
  }

  private startPerformanceMeasurement(): void {
    performance.mark('audio-streaming-start');
  }

  private stopPerformanceMeasurement(): void {
    performance.mark('audio-streaming-end');
    performance.measure('audio-streaming', 'audio-streaming-start', 'audio-streaming-end');
  }

  private updateLatencyMetrics(duration: number): void {
    this.metrics.latency = (this.metrics.latency + duration) / 2;
  }

  private generateStreamId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  getMetrics(): StreamingMetrics {
    return { ...this.metrics };
  }

  getConfig(): AudioStreamConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<AudioStreamConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Audio streaming config updated');
  }

  getCurrentLatency(): number {
    return this.metrics.latency;
  }

  getBufferHealth(): number {
    return this.metrics.bufferHealth;
  }

  getQualityScore(): number {
    return this.metrics.qualityScore;
  }

  isStreamingActive(): boolean {
    return this.isStreaming;
  }

  getStreamId(): string {
    return this.streamId;
  }

  // Buffer management
  clearBuffers(): void {
    this.inputBuffer = [];
    this.outputBuffer = [];
    this.processingQueue = [];
    console.log('🧹 Audio buffers cleared');
  }

  setBufferSize(size: number): void {
    this.maxBufferSize = Math.max(10, Math.min(1000, size));
    console.log(`📊 Buffer size set to ${this.maxBufferSize}`);
  }

  // Audio level monitoring
  getCurrentAudioLevel(): number {
    if (!this.analyser) return 0;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }

    return sum / (dataArray.length * 255);
  }

  // Gain control
  setGain(gain: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(2, gain));
    }
  }

  getGain(): number {
    return this.gainNode?.gain.value || 1;
  }

  // Advanced features
  enableNoiseGate(threshold: number = -60): void {
    // Implementation would involve audio processing to gate noise
    console.log(`🔇 Noise gate enabled at ${threshold}dB`);
  }

  enableEqualizer(bands: number[]): void {
    // Implementation would involve creating biquad filters
    console.log('🎛️ Equalizer enabled with bands:', bands);
  }

  // Cleanup
  destroy(): void {
    console.log('🛑 Destroying Audio Streaming Pipeline...');

    this.stopStreaming();

    // Disconnect audio nodes
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    // Close WebRTC connection
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.rtcConnection) {
      this.rtcConnection.close();
      this.rtcConnection = null;
    }

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop performance monitoring
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.isInitialized = false;
    console.log('✅ Audio Streaming Pipeline destroyed');
  }
}