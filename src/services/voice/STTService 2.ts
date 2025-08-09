import { useVoiceStore } from '@/stores/useVoiceStore';

/**
 * Speech-to-Text (STT) Service with Multi-Provider Support
 * 
 * Implements real-time speech transcription with fallback providers
 * Based on research showing AssemblyAI and Deepgram as top performers
 * 
 * Features:
 * - Multiple STT provider support with fallback
 * - Real-time streaming transcription
 * - Partial and final transcript handling
 * - Language detection and multi-language support
 * - Confidence scoring and word-level timestamps
 */

export interface STTConfig {
  provider: 'browser' | 'assemblyai' | 'deepgram' | 'openai';
  language: string;
  enablePartialResults: boolean;
  enablePunctuation: boolean;
  enableWordTimestamps: boolean;
  enableSpeakerDiarization: boolean;
  vocabularyBoost?: string[]; // Custom vocabulary for better recognition
  profanityFilter: boolean;
  
  // Callbacks
  onPartialTranscript?: (text: string, confidence: number) => void;
  onFinalTranscript?: (text: string, confidence: number, metadata?: TranscriptMetadata) => void;
  onError?: (error: Error) => void;
}

export interface TranscriptMetadata {
  startTime: number;
  endTime: number;
  words?: WordTimestamp[];
  speaker?: string;
  language?: string;
  confidence: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface STTProvider {
  name: string;
  initialize(config: Partial<STTConfig>): Promise<void>;
  startStreaming(stream: MediaStream): Promise<void>;
  stopStreaming(): void;
  destroy(): void;
  isAvailable(): boolean;
}

/**
 * Browser-based STT Provider using Web Speech API
 */
class BrowserSTTProvider implements STTProvider {
  name = 'Browser Speech Recognition';
  private recognition: any = null;
  private config: STTConfig;
  private isStreaming = false;

  constructor() {
    this.config = {
      provider: 'browser',
      language: 'en-US',
      enablePartialResults: true,
      enablePunctuation: true,
      enableWordTimestamps: false,
      enableSpeakerDiarization: false,
      profanityFilter: false,
    };
  }

  async initialize(config: Partial<STTConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    if (!this.isAvailable()) {
      throw new Error('Browser Speech Recognition not available');
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure recognition
    this.recognition.continuous = true;
    this.recognition.interimResults = this.config.enablePartialResults;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = 1;
    
    // Set up event handlers
    this.setupEventHandlers();
    
    console.log('✅ Browser STT initialized');
  }

  private setupEventHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript;
      const confidence = lastResult[0].confidence || 0.9; // Browser API doesn't always provide confidence
      
      if (lastResult.isFinal) {
        console.log(`📝 Final transcript: "${transcript}" (confidence: ${confidence})`);
        
        if (this.config.onFinalTranscript) {
          const metadata: TranscriptMetadata = {
            startTime: Date.now() - 1000, // Approximate
            endTime: Date.now(),
            confidence,
            language: this.config.language,
          };
          
          this.config.onFinalTranscript(transcript, confidence, metadata);
        }
      } else {
        console.log(`📝 Partial transcript: "${transcript}"`);
        
        if (this.config.onPartialTranscript) {
          this.config.onPartialTranscript(transcript, confidence);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('❌ Browser STT error:', event.error);
      
      if (this.config.onError) {
        this.config.onError(new Error(`STT error: ${event.error}`));
      }
      
      // Auto-restart on certain errors
      if (event.error === 'network' || event.error === 'aborted') {
        setTimeout(() => {
          if (this.isStreaming) {
            this.recognition.start();
          }
        }, 1000);
      }
    };

    this.recognition.onend = () => {
      console.log('🔚 Browser STT ended');
      
      // Restart if still supposed to be streaming
      if (this.isStreaming) {
        setTimeout(() => {
          this.recognition.start();
        }, 100);
      }
    };
  }

  async startStreaming(stream: MediaStream): Promise<void> {
    if (!this.recognition) {
      throw new Error('STT not initialized');
    }

    console.log('🎤 Starting browser STT streaming');
    this.isStreaming = true;
    
    try {
      this.recognition.start();
    } catch (error) {
      // Already started, ignore
      console.log('STT already running');
    }
  }

  stopStreaming(): void {
    if (!this.recognition) return;
    
    console.log('🔇 Stopping browser STT streaming');
    this.isStreaming = false;
    
    try {
      this.recognition.stop();
    } catch (error) {
      // Already stopped, ignore
    }
  }

  destroy(): void {
    this.stopStreaming();
    this.recognition = null;
  }

  isAvailable(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }
}

/**
 * OpenAI Whisper STT Provider (via backend)
 */
class OpenAISTTProvider implements STTProvider {
  name = 'OpenAI Whisper';
  private config: STTConfig;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private websocket: WebSocket | null = null;
  private backendUrl: string;

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl;
    this.config = {
      provider: 'openai',
      language: 'en',
      enablePartialResults: false, // Whisper doesn't support streaming
      enablePunctuation: true,
      enableWordTimestamps: true,
      enableSpeakerDiarization: false,
      profanityFilter: false,
    };
  }

  async initialize(config: Partial<STTConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Connect to backend WebSocket for STT
    await this.connectWebSocket();
    
    console.log('✅ OpenAI Whisper STT initialized');
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.backendUrl.replace('http', 'ws')}/api/v1/stt/whisper`;
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('✅ OpenAI STT WebSocket connected');
        resolve();
      };

      this.websocket.onerror = (error) => {
        console.error('❌ OpenAI STT WebSocket error:', error);
        reject(error);
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'transcript') {
            const metadata: TranscriptMetadata = {
              startTime: data.startTime,
              endTime: data.endTime,
              confidence: data.confidence || 0.95,
              language: data.language || this.config.language,
              words: data.words,
            };
            
            if (this.config.onFinalTranscript) {
              this.config.onFinalTranscript(data.text, metadata.confidence, metadata);
            }
          }
        } catch (error) {
          console.error('Failed to parse STT message:', error);
        }
      };
    });
  }

  async startStreaming(stream: MediaStream): Promise<void> {
    console.log('🎤 Starting OpenAI Whisper STT streaming');
    
    // Use MediaRecorder to capture audio chunks
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        
        // Send audio chunk to backend
        if (this.websocket?.readyState === WebSocket.OPEN) {
          // Convert to base64 for transmission
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result?.toString().split(',')[1];
            if (base64) {
              this.websocket?.send(JSON.stringify({
                type: 'audio',
                data: base64,
                timestamp: Date.now(),
              }));
            }
          };
          reader.readAsDataURL(event.data);
        }
      }
    };
    
    // Start recording in chunks
    this.mediaRecorder.start(1000); // 1 second chunks
  }

  stopStreaming(): void {
    console.log('🔇 Stopping OpenAI Whisper STT streaming');
    
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    this.audioChunks = [];
  }

  destroy(): void {
    this.stopStreaming();
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.mediaRecorder = null;
  }

  isAvailable(): boolean {
    return true; // Always available via backend
  }
}

/**
 * Main STT Service with multi-provider support and fallback
 */
export class STTService {
  private static instance: STTService;
  
  private providers: STTProvider[] = [];
  private currentProvider: STTProvider | null = null;
  private currentProviderIndex = 0;
  private config: STTConfig;
  private stream: MediaStream | null = null;
  private isTranscribing = false;
  
  // Transcript management
  private currentTranscript = '';
  private transcriptHistory: TranscriptMetadata[] = [];
  private maxHistoryLength = 100;

  static getInstance(): STTService {
    if (!STTService.instance) {
      STTService.instance = new STTService();
    }
    return STTService.instance;
  }

  private constructor() {
    this.config = {
      provider: 'browser',
      language: 'en-US',
      enablePartialResults: true,
      enablePunctuation: true,
      enableWordTimestamps: false,
      enableSpeakerDiarization: false,
      profanityFilter: false,
    };
  }

  /**
   * Initialize STT service with providers
   */
  async initialize(config: Partial<STTConfig> = {}): Promise<void> {
    console.log('🎯 Initializing STT service...');
    
    this.config = { ...this.config, ...config };
    
    // Set up callbacks
    const callbacks = {
      onPartialTranscript: (text: string, confidence: number) => {
        this.handlePartialTranscript(text, confidence);
        if (config.onPartialTranscript) {
          config.onPartialTranscript(text, confidence);
        }
      },
      onFinalTranscript: (text: string, confidence: number, metadata?: TranscriptMetadata) => {
        this.handleFinalTranscript(text, confidence, metadata);
        if (config.onFinalTranscript) {
          config.onFinalTranscript(text, confidence, metadata);
        }
      },
      onError: (error: Error) => {
        this.handleError(error);
        if (config.onError) {
          config.onError(error);
        }
      },
    };
    
    // Initialize providers based on configuration
    const providers: STTProvider[] = [];
    
    // Browser Speech API (primary for web)
    const browserProvider = new BrowserSTTProvider();
    if (browserProvider.isAvailable()) {
      providers.push(browserProvider);
    }
    
    // OpenAI Whisper (fallback)
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com';
    const openaiProvider = new OpenAISTTProvider(backendUrl);
    providers.push(openaiProvider);
    
    // Initialize providers
    for (const provider of providers) {
      try {
        await provider.initialize({ ...this.config, ...callbacks });
        this.providers.push(provider);
        console.log(`✅ STT provider initialized: ${provider.name}`);
      } catch (error) {
        console.warn(`⚠️ Failed to initialize ${provider.name}:`, error);
      }
    }
    
    if (this.providers.length === 0) {
      throw new Error('No STT providers available');
    }
    
    // Set primary provider
    this.currentProvider = this.providers[0];
    console.log(`🎤 Using primary STT provider: ${this.currentProvider.name}`);
  }

  /**
   * Start transcribing audio from stream
   */
  async startTranscribing(stream: MediaStream): Promise<void> {
    if (!this.currentProvider) {
      throw new Error('STT service not initialized');
    }
    
    if (this.isTranscribing) {
      console.log('⚠️ Already transcribing');
      return;
    }
    
    console.log('🎤 Starting transcription...');
    
    this.stream = stream;
    this.isTranscribing = true;
    this.currentTranscript = '';
    
    try {
      await this.currentProvider.startStreaming(stream);
      
      const store = useVoiceStore.getState();
      store.setAgentStatus('listening');
      
    } catch (error) {
      console.error('❌ Failed to start transcription:', error);
      
      // Try fallback provider
      await this.tryFallbackProvider(stream);
    }
  }

  /**
   * Stop transcribing
   */
  stopTranscribing(): void {
    if (!this.isTranscribing) {
      return;
    }
    
    console.log('🔇 Stopping transcription...');
    
    this.isTranscribing = false;
    
    if (this.currentProvider) {
      this.currentProvider.stopStreaming();
    }
  }

  /**
   * Handle partial transcript
   */
  private handlePartialTranscript(text: string, confidence: number): void {
    console.log(`📝 Partial: "${text}" (${Math.round(confidence * 100)}%)`);
    
    this.currentTranscript = text;
    
    // Update UI with partial transcript
    const store = useVoiceStore.getState();
    // Could add a partial transcript field to the store if needed
  }

  /**
   * Handle final transcript
   */
  private handleFinalTranscript(text: string, confidence: number, metadata?: TranscriptMetadata): void {
    console.log(`📝 Final: "${text}" (${Math.round(confidence * 100)}%)`);
    
    // Add to history
    if (metadata) {
      this.transcriptHistory.push(metadata);
      
      // Trim history if too long
      if (this.transcriptHistory.length > this.maxHistoryLength) {
        this.transcriptHistory.shift();
      }
    }
    
    // Reset current transcript
    this.currentTranscript = '';
  }

  /**
   * Handle STT errors
   */
  private handleError(error: Error): void {
    console.error('❌ STT error:', error);
    
    const store = useVoiceStore.getState();
    store.setError(`Speech recognition error: ${error.message}`);
    
    // Try fallback if available
    if (this.stream && this.isTranscribing) {
      this.tryFallbackProvider(this.stream);
    }
  }

  /**
   * Try fallback STT provider
   */
  private async tryFallbackProvider(stream: MediaStream): Promise<void> {
    this.currentProviderIndex++;
    
    if (this.currentProviderIndex >= this.providers.length) {
      console.error('❌ All STT providers failed');
      this.stopTranscribing();
      return;
    }
    
    const fallbackProvider = this.providers[this.currentProviderIndex];
    console.log(`🔄 Switching to fallback STT provider: ${fallbackProvider.name}`);
    
    this.currentProvider = fallbackProvider;
    
    try {
      await this.currentProvider.startStreaming(stream);
    } catch (error) {
      console.error(`❌ Fallback provider ${fallbackProvider.name} also failed:`, error);
      
      // Try next fallback
      await this.tryFallbackProvider(stream);
    }
  }

  /**
   * Get current transcript
   */
  getCurrentTranscript(): string {
    return this.currentTranscript;
  }

  /**
   * Get transcript history
   */
  getTranscriptHistory(): TranscriptMetadata[] {
    return this.transcriptHistory;
  }

  /**
   * Clear transcript history
   */
  clearHistory(): void {
    this.transcriptHistory = [];
    this.currentTranscript = '';
  }

  /**
   * Destroy STT service
   */
  destroy(): void {
    console.log('🧹 Destroying STT service...');
    
    this.stopTranscribing();
    
    for (const provider of this.providers) {
      provider.destroy();
    }
    
    this.providers = [];
    this.currentProvider = null;
    this.stream = null;
    this.clearHistory();
    
    console.log('✅ STT service destroyed');
  }

  /**
   * Get service status
   */
  getStatus(): {
    isTranscribing: boolean;
    currentProvider: string | null;
    providersAvailable: number;
    currentTranscript: string;
    historyLength: number;
  } {
    return {
      isTranscribing: this.isTranscribing,
      currentProvider: this.currentProvider?.name || null,
      providersAvailable: this.providers.length,
      currentTranscript: this.currentTranscript,
      historyLength: this.transcriptHistory.length,
    };
  }
}

// Export singleton instance
export const sttService = STTService.getInstance();