/**
 * Hybrid Wake Word Service
 *
 * Intelligently selects the best wake word detection method:
 * 1. microWakeWord (TFLite model) - Best quality, offline, survives tab blur
 * 2. Web Speech API (fallback) - Works everywhere, but less reliable
 *
 * The service tries microWakeWord first and falls back gracefully if:
 * - Model is not yet trained/available
 * - Browser doesn't support AudioWorklet
 * - Loading fails for any reason
 */

import { logger } from '@/lib/logger';
import { wakeWordService, type WakeWordOptions } from './wakeWordService';
import { microWakeWordService } from './microWakeWordService';

export type { WakeWordOptions } from './wakeWordService';

type WakeWordEngine = 'micro' | 'web-speech' | 'none';

class WakeWordHybridService {
  private currentEngine: WakeWordEngine = 'none';
  private options: WakeWordOptions | null = null;

  /**
   * Check if any wake word detection is supported
   */
  public isSupported(): boolean {
    return microWakeWordService.isSupported() || wakeWordService.isSupported();
  }

  /**
   * Get the current engine being used
   */
  public getEngine(): WakeWordEngine {
    return this.currentEngine;
  }

  /**
   * Preload microWakeWord model for faster first activation
   */
  public async preloadModel(): Promise<void> {
    try {
      await microWakeWordService.preloadModel();
      logger.info('[WakeWordHybrid] Model preloaded successfully');
    } catch (error) {
      logger.debug('[WakeWordHybrid] Model preload skipped - not available yet');
    }
  }

  /**
   * Start listening for wake word using best available engine
   */
  public async start(options: WakeWordOptions): Promise<void> {
    this.options = options;

    // Try microWakeWord first (better quality)
    if (microWakeWordService.isSupported()) {
      try {
        logger.info('[WakeWordHybrid] Attempting microWakeWord (TFLite model)...');

        await microWakeWordService.start({
          onWakeWordDetected: options.onWakeWordDetected,
          onError: (error) => {
            logger.warn('[WakeWordHybrid] microWakeWord error, trying fallback:', error);
            this.fallbackToWebSpeech();
          },
          onStatusChange: options.onStatusChange,
          sensitivity: options.confidence,
        });

        this.currentEngine = 'micro';
        logger.info('[WakeWordHybrid] Using microWakeWord (TFLite model)');
        return;
      } catch (error) {
        logger.warn('[WakeWordHybrid] microWakeWord failed, falling back to Web Speech API');
      }
    }

    // Fallback to Web Speech API
    await this.fallbackToWebSpeech();
  }

  /**
   * Fall back to Web Speech API
   */
  private async fallbackToWebSpeech(): Promise<void> {
    if (!this.options) return;

    if (!wakeWordService.isSupported()) {
      const error = 'No wake word detection method available in this browser';
      logger.error(`[WakeWordHybrid] ${error}`);
      this.options.onError?.(error);
      throw new Error(error);
    }

    try {
      await wakeWordService.start(this.options);
      this.currentEngine = 'web-speech';
      logger.info('[WakeWordHybrid] Using Web Speech API (fallback)');
    } catch (error) {
      this.currentEngine = 'none';
      throw error;
    }
  }

  /**
   * Stop listening for wake word
   */
  public stop(): void {
    if (this.currentEngine === 'micro') {
      microWakeWordService.stop();
    } else if (this.currentEngine === 'web-speech') {
      wakeWordService.stop();
    }

    this.currentEngine = 'none';
    this.options?.onStatusChange?.(false);
  }

  /**
   * Get current listening status
   */
  public getStatus(): boolean {
    if (this.currentEngine === 'micro') {
      return microWakeWordService.getStatus();
    } else if (this.currentEngine === 'web-speech') {
      return wakeWordService.getStatus();
    }
    return false;
  }

  /**
   * Check if microWakeWord model is loaded and ready
   */
  public isModelLoaded(): boolean {
    return microWakeWordService.isModelLoaded();
  }
}

// Export singleton instance
export const wakeWordHybridService = new WakeWordHybridService();

// Default export for backward compatibility
export default wakeWordHybridService;
