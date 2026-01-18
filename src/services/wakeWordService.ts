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
  private shouldRestart: boolean = true;
  private lastError: string | null = null;
  private lastDetectionTime: number = 0;
  private static readonly DEBOUNCE_MS = 2000; // Prevent rapid re-triggering

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
    this.shouldRestart = true; // Enable automatic restart for continuous listening
    this.lastError = null; // Clear any previous errors

    try {
      // Create speech recognition instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // Configure for wake word detection
      this.recognition.continuous = true; // Keep listening
      this.recognition.interimResults = false; // Only process final results to prevent double-detection
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      // Handle wake word detection
      this.recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const result = event.results[last];
        const transcript = result[0].transcript.toLowerCase().trim();
        // Handle undefined confidence (common with interim results)
        const confidence = result[0].confidence ?? 0.9;
        const isFinal = result.isFinal;

        logger.debug(`🎤 Heard: "${transcript}" (confidence: ${confidence.toFixed(2)}, final: ${isFinal})`);

        // Check if transcript contains wake word
        const wakeWordDetected = this.checkWakeWord(transcript, confidence);

        if (wakeWordDetected) {
          // Debounce: skip if triggered too recently
          const now = Date.now();
          if (now - this.lastDetectionTime < WakeWordService.DEBOUNCE_MS) {
            logger.debug(`🔇 Debounced wake word (${now - this.lastDetectionTime}ms since last)`);
            return;
          }
          this.lastDetectionTime = now;
          logger.info(`Wake word detected: "${transcript}"`);
          this.options?.onWakeWordDetected();
        }
      };

      // Handle errors
      this.recognition.onerror = (event: any) => {
        const errorType = event.error;
        this.lastError = errorType;

        // Log error (debug level for expected errors)
        if (errorType === 'no-speech') {
          logger.debug('Wake word: no speech detected (normal)');
        } else if (errorType === 'aborted') {
          logger.debug('Wake word: recognition aborted (expected when stopping)');
        } else {
          logger.error(`Wake word recognition error: ${errorType}`);
        }

        // Don't treat "no-speech" or "aborted" as critical errors
        if (errorType !== 'no-speech' && errorType !== 'aborted') {
          this.options?.onError?.(`Recognition error: ${errorType}`);
        }

        // Auto-restart on recoverable errors (but not "aborted")
        if ((errorType === 'no-speech' || errorType === 'audio-capture') && this.shouldRestart) {
          this.scheduleRestart();
        }

        // Don't restart on "aborted" - it means we're stopping intentionally
        if (errorType === 'aborted') {
          this.shouldRestart = false;
        }
      };

      // Handle end (auto-restart for continuous listening)
      this.recognition.onend = () => {
        // Only restart if shouldRestart is true (not explicitly stopped)
        if (this.shouldRestart && this.isListening) {
          logger.debug('Wake word recognition ended, restarting...');
          this.scheduleRestart();
        } else {
          logger.debug('Wake word recognition ended (no restart - explicitly stopped)');
        }
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
    // Prevent automatic restart when explicitly stopped
    this.shouldRestart = false;

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    // Set isListening false BEFORE calling recognition.stop() to prevent race conditions
    this.isListening = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        logger.error('Error stopping wake word recognition:', error);
      }
      this.recognition = null;
    }

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

    // Higher threshold (0.85) reduces false positives from ambient noise
    const minConfidence = this.options.confidence ?? 0.85;

    // Check confidence threshold
    if (confidence < minConfidence) {
      logger.debug(`Confidence ${confidence.toFixed(2)} below threshold ${minConfidence}`);
      return false;
    }

    // Normalize transcript
    const normalizedTranscript = transcript.replace(/[,.\s]+/g, ' ').trim();
    logger.debug(`Checking normalized: "${normalizedTranscript}"`);

    // All PAM wake word variations - any greeting + "pam"
    const pamWakeWords = [
      'hey pam',
      'hi pam',
      'hello pam',
      'good morning pam',
      'good afternoon pam',
      'good evening pam',
      'morning pam',
      'evening pam',
      'yo pam',
      'ok pam',
      'okay pam'
    ];

    // Strict matching: only exact match or starts with wake word
    // Removed containsWakeWord to prevent false positives from partial phrases
    return pamWakeWords.some(wakeWord => {
      const exactMatch = normalizedTranscript === wakeWord;
      const startsWithWakeWord = normalizedTranscript.startsWith(wakeWord + ' ');
      return exactMatch || startsWithWakeWord;
    });
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
