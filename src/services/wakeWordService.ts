/**
 * Wake Word Service for "Hey Pam" Detection
 *
 * Uses Web Speech API for continuous listening and wake word detection.
 * Alternative approach: Could use Porcupine by Picovoice for more robust detection.
 *
 * Privacy: Audio processing happens locally in browser, not sent to server.
 */

import { logger } from '@/lib/logger';

export type WakeWordCallback = () => void;

export interface WakeWordOptions {
  wakeWord: string; // e.g., "hey pam", "pam"
  onWakeWordDetected: WakeWordCallback;
  onError?: (error: string) => void;
  onStatusChange?: (listening: boolean) => void;
  confidence?: number; // 0-1, how strict to be (default: 0.7)
}

class WakeWordService {
  private recognition: any | null = null;
  private isListening: boolean = false;
  private options: WakeWordOptions | null = null;
  private restartTimeout: NodeJS.Timeout | null = null;

  /**
   * Check if wake word detection is supported in this browser
   */
  public isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  /**
   * Start listening for wake word
   */
  public async start(options: WakeWordOptions): Promise<void> {
    if (!this.isSupported()) {
      const error = 'Wake word detection not supported in this browser';
      logger.error(error);
      options.onError?.(error);
      throw new Error(error);
    }

    if (this.isListening) {
      logger.warn('Wake word service already listening');
      return;
    }

    this.options = options;

    try {
      // Create speech recognition instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // Configure for wake word detection
      this.recognition.continuous = true; // Keep listening
      this.recognition.interimResults = true; // Get partial results for faster response
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      // Handle wake word detection
      this.recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const result = event.results[last];
        const transcript = result[0].transcript.toLowerCase().trim();
        const confidence = result[0].confidence;

        logger.debug(`🎤 Heard: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

        // Check if transcript contains wake word
        const wakeWordDetected = this.checkWakeWord(transcript, confidence);

        if (wakeWordDetected) {
          logger.info(`✨ Wake word detected: "${transcript}"`);
          this.options?.onWakeWordDetected();
        }
      };

      // Handle errors
      this.recognition.onerror = (event: any) => {
        logger.error(`Wake word recognition error: ${event.error}`);

        // Don't treat "no-speech" as error - it's normal
        if (event.error !== 'no-speech') {
          this.options?.onError?.(`Recognition error: ${event.error}`);
        }

        // Auto-restart on certain errors
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          this.scheduleRestart();
        }
      };

      // Handle end (auto-restart for continuous listening)
      this.recognition.onend = () => {
        logger.debug('Wake word recognition ended, restarting...');
        this.scheduleRestart();
      };

      // Start recognition
      this.recognition.start();
      this.isListening = true;
      this.options?.onStatusChange?.(true);
      logger.info('👂 Wake word listening started');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to start wake word detection: ${errorMsg}`);
      this.options?.onError?.(errorMsg);
      throw error;
    }
  }

  /**
   * Stop listening for wake word
   */
  public stop(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        logger.error('Error stopping wake word recognition:', error);
      }
      this.recognition = null;
    }

    this.isListening = false;
    this.options?.onStatusChange?.(false);
    logger.info('🔇 Wake word listening stopped');
  }

  /**
   * Get current listening status
   */
  public getStatus(): boolean {
    return this.isListening;
  }

  /**
   * Check if transcript contains wake word with sufficient confidence
   */
  private checkWakeWord(transcript: string, confidence: number): boolean {
    if (!this.options) return false;

    const minConfidence = this.options.confidence ?? 0.7;
    const wakeWord = this.options.wakeWord.toLowerCase();

    // Check confidence threshold
    if (confidence < minConfidence) {
      return false;
    }

    // Check for wake word in transcript
    // Support variations: "hey pam", "hey, pam", "hey  pam"
    const normalizedTranscript = transcript.replace(/[,.\s]+/g, ' ').trim();
    const normalizedWakeWord = wakeWord.replace(/[,.\s]+/g, ' ').trim();

    // Check for exact match or wake word at start of sentence
    const exactMatch = normalizedTranscript === normalizedWakeWord;
    const startsWithWakeWord = normalizedTranscript.startsWith(normalizedWakeWord + ' ');
    const containsWakeWord = normalizedTranscript.includes(normalizedWakeWord);

    return exactMatch || startsWithWakeWord || containsWakeWord;
  }

  /**
   * Schedule restart after brief delay (prevents rapid restart loops)
   */
  private scheduleRestart(): void {
    if (!this.isListening || !this.options) return;

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }

    this.restartTimeout = setTimeout(() => {
      if (this.isListening && this.options) {
        try {
          this.recognition?.start();
        } catch (error) {
          logger.error('Failed to restart wake word recognition:', error);
        }
      }
    }, 1000); // 1 second delay before restart
  }
}

// Export singleton instance
export const wakeWordService = new WakeWordService();
