import { useVoiceStore, type AudioQueueItem, type VoiceSettings } from '@/stores/useVoiceStore';

/**
 * VoiceOrchestrator - Centralized voice management service
 * 
 * This is the SINGLE point of entry for all TTS operations in the application.
 * Eliminates duplicate audio playback by ensuring all voice requests go through one queue.
 * 
 * Based on research patterns from production voice agents.
 */
export class VoiceOrchestrator {
  private static instance: VoiceOrchestrator;
  private ttsProviders: TTSProvider[] = [];
  private currentProvider = 0;
  private isInitialized = false;

  // Singleton pattern to ensure only one orchestrator exists
  static getInstance(): VoiceOrchestrator {
    if (!VoiceOrchestrator.instance) {
      VoiceOrchestrator.instance = new VoiceOrchestrator();
    }
    return VoiceOrchestrator.instance;
  }

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Initialize the orchestrator with TTS providers
   */
  async initialize(providers: TTSProvider[]): Promise<void> {
    if (this.isInitialized) {
      console.log('🎵 VoiceOrchestrator already initialized');
      return;
    }

    console.log(`🎵 Initializing VoiceOrchestrator with ${providers.length} providers`);
    this.ttsProviders = providers;
    
    // Test primary provider
    try {
      await this.testProvider(this.ttsProviders[0]);
      console.log('✅ Primary TTS provider ready');
    } catch (error) {
      console.warn('⚠️ Primary TTS provider failed, will use fallbacks:', error);
    }
    
    this.isInitialized = true;
  }

  /**
   * Main method to enqueue text for speech synthesis and playback
   * This is the ONLY method that should be called from components
   */
  async speak(
    text: string, 
    options: SpeakOptions = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('VoiceOrchestrator not initialized');
    }

    const store = useVoiceStore.getState();
    
    // Check if voice is enabled
    if (!store.isVoiceEnabled || !store.settings.enabled) {
      console.log('🔇 Voice disabled, skipping TTS');
      return;
    }

    // Check if muted
    if (store.isMuted) {
      console.log('🔇 Voice muted, skipping TTS');
      return;
    }

    const speechId = this.generateSpeechId();
    
    try {
      console.log(`🎵 Processing speech request: "${text.substring(0, 50)}..." (ID: ${speechId})`);
      
      // Attempt synthesis with fallback logic
      const audioData = await this.synthesizeWithFallback(text, store.settings, options);
      
      // Create queue item
      const queueItem: Omit<AudioQueueItem, 'timestamp'> = {
        id: speechId,
        audioData,
        text,
        priority: options.priority || 'normal',
        chunkId: options.chunkId,
      };
      
      // Add to queue - AudioPlayer will handle playback
      store.enqueueAudio(queueItem);
      
      console.log(`✅ Speech queued successfully: ${speechId}`);
      
    } catch (error) {
      console.error(`❌ Speech synthesis failed for: "${text}"`, error);
      store.setError(`Speech synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Fallback to text display if configured
      if (options.fallbackToText) {
        this.displayTextFallback(text, options.fallbackContainer);
      }
    }
  }

  /**
   * Attempt synthesis with automatic provider fallback
   */
  private async synthesizeWithFallback(
    text: string,
    settings: VoiceSettings,
    options: SpeakOptions
  ): Promise<ArrayBuffer> {
    let lastError: Error | null = null;
    
    // Try each provider in order
    for (let i = 0; i < this.ttsProviders.length; i++) {
      const providerIndex = (this.currentProvider + i) % this.ttsProviders.length;
      const provider = this.ttsProviders[providerIndex];
      
      try {
        console.log(`🎵 Attempting synthesis with provider: ${provider.name}`);
        
        const audioData = await provider.synthesize(text, {
          voice: settings.voice,
          rate: settings.rate,
          volume: settings.volume,
          ...options.ttsOptions,
        });
        
        // Success - update current provider for future requests
        this.currentProvider = providerIndex;
        console.log(`✅ Synthesis successful with provider: ${provider.name}`);
        
        return audioData;
        
      } catch (error) {
        console.warn(`⚠️ Provider ${provider.name} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }
    
    // All providers failed
    throw new Error(`All TTS providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Test if a TTS provider is available
   */
  private async testProvider(provider: TTSProvider): Promise<void> {
    try {
      await provider.test?.();
    } catch (error) {
      throw new Error(`Provider ${provider.name} test failed: ${error}`);
    }
  }

  /**
   * Cancel current speech and clear queue
   */
  cancelSpeech(): void {
    console.log('⏹️ Cancelling all speech');
    const store = useVoiceStore.getState();
    store.clearAudioQueue();
  }

  /**
   * Interrupt current speech (for barge-in)
   */
  interrupt(): void {
    console.log('⚠️ Interrupting speech for user input');
    const store = useVoiceStore.getState();
    store.handleInterrupt();
  }

  /**
   * Display text fallback when TTS fails
   */
  private displayTextFallback(text: string, container?: string): void {
    console.log('📝 Displaying text fallback');
    
    // Create a temporary notification or modal
    const event = new CustomEvent('voice-fallback', {
      detail: { text, container }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Generate unique speech request ID
   */
  private generateSpeechId(): string {
    return `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current orchestrator status
   */
  getStatus(): OrchestratorStatus {
    return {
      initialized: this.isInitialized,
      providersCount: this.ttsProviders.length,
      currentProvider: this.currentProvider < this.ttsProviders.length ? 
        this.ttsProviders[this.currentProvider].name : 'none',
      queueSize: useVoiceStore.getState().audioQueue.length,
    };
  }
}

// Type definitions
export interface TTSProvider {
  name: string;
  synthesize: (text: string, options: TTSOptions) => Promise<ArrayBuffer>;
  test?: () => Promise<void>;
  priority: number; // Lower number = higher priority
}

export interface TTSOptions {
  voice?: string;
  rate?: number;
  volume?: number;
  format?: 'mp3' | 'wav' | 'opus';
  streaming?: boolean;
}

export interface SpeakOptions {
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  chunkId?: string;
  fallbackToText?: boolean;
  fallbackContainer?: string;
  ttsOptions?: Partial<TTSOptions>;
}

export interface OrchestratorStatus {
  initialized: boolean;
  providersCount: number;
  currentProvider: string;
  queueSize: number;
}

// Export singleton instance
export const voiceOrchestrator = VoiceOrchestrator.getInstance();

/**
 * React hook for easy access to voice orchestrator
 */
export const useVoiceOrchestrator = () => {
  return {
    speak: voiceOrchestrator.speak.bind(voiceOrchestrator),
    cancel: voiceOrchestrator.cancelSpeech.bind(voiceOrchestrator),
    interrupt: voiceOrchestrator.interrupt.bind(voiceOrchestrator),
    getStatus: voiceOrchestrator.getStatus.bind(voiceOrchestrator),
  };
};