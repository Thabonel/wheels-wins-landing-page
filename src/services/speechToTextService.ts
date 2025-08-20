/**
 * Speech-to-Text Service
 * Browser-based speech recognition with fallback support
 */

// Extend window for speech recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    SpeechGrammarList: any;
    webkitSpeechGrammarList: any;
  }
}

export interface STTConfig {
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  language?: string;
  grammars?: string[];
}

export interface STTResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
}

export type STTStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

export interface STTCallbacks {
  onResult?: (result: STTResult) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onStatusChange?: (status: STTStatus) => void;
}

class SpeechToTextService {
  private recognition: any = null;
  private isListening = false;
  private status: STTStatus = 'idle';
  private callbacks: STTCallbacks = {};
  private config: STTConfig = {};
  private recognitionTimeout: NodeJS.Timeout | null = null;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private lastSpeechTime = 0;
  private restartAttempts = 0;
  private maxRestartAttempts = 3;
  
  // Voice commands
  private voiceCommands: Map<RegExp, (match: RegExpMatchArray) => void> = new Map();

  constructor() {
    this.initializeRecognition();
  }

  /**
   * Check if speech recognition is supported
   */
  isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Initialize speech recognition
   */
  private initializeRecognition(): void {
    if (!this.isSupported()) {
      console.error('❌ Speech recognition not supported in this browser');
      this.status = 'unsupported';
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Set default configuration
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = 'en-US';

    // Set up event handlers
    this.setupEventHandlers();
    
    console.log('✅ Speech recognition initialized');
  }

  /**
   * Set up recognition event handlers
   */
  private setupEventHandlers(): void {
    if (!this.recognition) return;

    // On start
    this.recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      this.isListening = true;
      this.restartAttempts = 0;
      this.updateStatus('listening');
      this.callbacks.onStart?.();
      this.startSilenceDetection();
    };

    // On result
    this.recognition.onresult = (event: any) => {
      this.lastSpeechTime = Date.now();
      this.resetSilenceDetection();

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0.9;

        // Build alternatives array
        const alternatives: STTResult['alternatives'] = [];
        for (let j = 1; j < Math.min(result.length, this.config.maxAlternatives || 3); j++) {
          alternatives.push({
            transcript: result[j].transcript,
            confidence: result[j].confidence || 0
          });
        }

        const sttResult: STTResult = {
          transcript,
          confidence,
          isFinal: result.isFinal,
          alternatives: alternatives.length > 0 ? alternatives : undefined
        };

        console.log(`🎤 ${result.isFinal ? 'Final' : 'Interim'} result:`, transcript);

        // Check for voice commands
        if (result.isFinal) {
          this.processVoiceCommands(transcript);
        }

        // Trigger callback
        this.callbacks.onResult?.(sttResult);
      }
    };

    // On error
    this.recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      
      const error = new Error(`Speech recognition error: ${event.error}`);
      this.callbacks.onError?.(error);

      // Handle different error types
      switch (event.error) {
        case 'network':
          this.handleNetworkError();
          break;
        case 'not-allowed':
        case 'permission-denied':
          this.updateStatus('error');
          this.stop();
          break;
        case 'no-speech':
          this.handleNoSpeech();
          break;
        case 'aborted':
          this.handleAborted();
          break;
        default:
          this.updateStatus('error');
      }
    };

    // On end
    this.recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      this.isListening = false;
      this.clearTimeouts();
      
      // Auto-restart if configured for continuous mode
      if (this.config.continuous && this.status === 'listening') {
        this.restart();
      } else {
        this.updateStatus('idle');
        this.callbacks.onEnd?.();
      }
    };

    // Additional events for debugging
    this.recognition.onsoundstart = () => {
      console.log('🔊 Sound detected');
    };

    this.recognition.onsoundend = () => {
      console.log('🔇 Sound ended');
    };

    this.recognition.onspeechstart = () => {
      console.log('💬 Speech detected');
      this.updateStatus('processing');
    };

    this.recognition.onspeechend = () => {
      console.log('🤐 Speech ended');
      this.updateStatus('listening');
    };
  }

  /**
   * Configure speech recognition
   */
  configure(config: STTConfig, callbacks?: STTCallbacks): void {
    this.config = { ...this.config, ...config };
    
    if (callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks };
    }

    if (this.recognition) {
      this.recognition.continuous = config.continuous ?? true;
      this.recognition.interimResults = config.interimResults ?? true;
      this.recognition.maxAlternatives = config.maxAlternatives ?? 3;
      this.recognition.lang = config.language ?? 'en-US';

      // Set up grammars if provided
      if (config.grammars && window.SpeechGrammarList) {
        const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
        const grammarList = new SpeechGrammarList();
        
        config.grammars.forEach(grammar => {
          grammarList.addFromString(grammar, 1);
        });
        
        this.recognition.grammars = grammarList;
      }
    }

    console.log('⚙️ Speech recognition configured:', config);
  }

  /**
   * Start speech recognition
   */
  start(): void {
    if (!this.recognition) {
      console.error('Speech recognition not initialized');
      return;
    }

    if (this.isListening) {
      console.log('Already listening');
      return;
    }

    try {
      this.recognition.start();
      this.startRecognitionTimeout();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Stop speech recognition
   */
  stop(): void {
    if (!this.recognition) return;

    try {
      this.recognition.stop();
      this.clearTimeouts();
      this.isListening = false;
      this.updateStatus('idle');
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }

  /**
   * Restart speech recognition
   */
  private restart(): void {
    if (this.restartAttempts >= this.maxRestartAttempts) {
      console.error('Max restart attempts reached');
      this.updateStatus('error');
      return;
    }

    this.restartAttempts++;
    console.log(`🔄 Restarting speech recognition (attempt ${this.restartAttempts})`);
    
    setTimeout(() => {
      this.start();
    }, 100);
  }

  /**
   * Handle network errors
   */
  private handleNetworkError(): void {
    console.log('🌐 Network error, attempting restart...');
    this.updateStatus('error');
    setTimeout(() => this.restart(), 1000);
  }

  /**
   * Handle no speech detected
   */
  private handleNoSpeech(): void {
    console.log('🤫 No speech detected');
    if (this.config.continuous) {
      this.restart();
    }
  }

  /**
   * Handle aborted recognition
   */
  private handleAborted(): void {
    console.log('⛔ Recognition aborted');
    if (this.config.continuous && this.status === 'listening') {
      this.restart();
    }
  }

  /**
   * Start recognition timeout
   */
  private startRecognitionTimeout(): void {
    this.clearRecognitionTimeout();
    
    // Timeout after 60 seconds of no activity
    this.recognitionTimeout = setTimeout(() => {
      console.log('⏱️ Recognition timeout, restarting...');
      this.stop();
      if (this.config.continuous) {
        this.start();
      }
    }, 60000);
  }

  /**
   * Clear recognition timeout
   */
  private clearRecognitionTimeout(): void {
    if (this.recognitionTimeout) {
      clearTimeout(this.recognitionTimeout);
      this.recognitionTimeout = null;
    }
  }

  /**
   * Start silence detection
   */
  private startSilenceDetection(): void {
    this.resetSilenceDetection();
  }

  /**
   * Reset silence detection timer
   */
  private resetSilenceDetection(): void {
    this.clearSilenceTimeout();
    
    // Stop after 5 seconds of silence
    this.silenceTimeout = setTimeout(() => {
      const silenceDuration = Date.now() - this.lastSpeechTime;
      if (silenceDuration > 5000 && !this.config.continuous) {
        console.log('🔇 Stopping due to silence');
        this.stop();
      }
    }, 5000);
  }

  /**
   * Clear silence timeout
   */
  private clearSilenceTimeout(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  /**
   * Clear all timeouts
   */
  private clearTimeouts(): void {
    this.clearRecognitionTimeout();
    this.clearSilenceTimeout();
  }

  /**
   * Update status
   */
  private updateStatus(status: STTStatus): void {
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }

  /**
   * Register voice command
   */
  registerCommand(pattern: RegExp, handler: (match: RegExpMatchArray) => void): void {
    this.voiceCommands.set(pattern, handler);
    console.log('📝 Voice command registered:', pattern);
  }

  /**
   * Process voice commands
   */
  private processVoiceCommands(transcript: string): void {
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    for (const [pattern, handler] of this.voiceCommands) {
      const match = normalizedTranscript.match(pattern);
      if (match) {
        console.log('🎯 Voice command matched:', pattern);
        handler(match);
        break;
      }
    }
  }

  /**
   * Get current status
   */
  getStatus(): STTStatus {
    return this.status;
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    // Common language codes supported by most browsers
    return [
      'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN',
      'es-ES', 'es-MX', 'es-AR',
      'fr-FR', 'fr-CA',
      'de-DE', 'de-AT', 'de-CH',
      'it-IT',
      'pt-BR', 'pt-PT',
      'zh-CN', 'zh-TW',
      'ja-JP',
      'ko-KR',
      'ru-RU',
      'ar-SA',
      'hi-IN'
    ];
  }
}

// Export singleton instance
export const sttService = new SpeechToTextService();

// Export common voice commands
export const COMMON_VOICE_COMMANDS = {
  WAKE_WORD: /^(hey pam|hello pam|hi pam|pam)/i,
  STOP: /^(stop|cancel|nevermind)/i,
  HELP: /^(help|what can you do|commands)/i,
  NAVIGATE: /^(go to|open|show me|navigate to)\s+(.+)/i,
  SEARCH: /^(search for|find|look for)\s+(.+)/i,
  CALCULATE: /^(calculate|what is|how much is)\s+(.+)/i
};

export default sttService;