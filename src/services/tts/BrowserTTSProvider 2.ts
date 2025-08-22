import { TTSProvider, TTSOptions } from '../VoiceOrchestrator';

/**
 * Browser Native TTS Provider - Fallback provider using Web Speech API
 * Always available, no network dependency, but limited voice quality
 */
export class BrowserTTSProvider implements TTSProvider {
  name = 'Browser';
  priority = 99; // Lowest priority (last fallback)
  
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded = false;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.loadVoices();
  }

  private async loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      // Some browsers load voices asynchronously
      const loadVoicesIfAvailable = () => {
        this.voices = this.synthesis.getVoices();
        if (this.voices.length > 0) {
          this.voicesLoaded = true;
          console.log(`🎵 [Browser] Loaded ${this.voices.length} voices`);
          resolve();
        }
      };

      // Try immediate load
      loadVoicesIfAvailable();

      // If no voices yet, wait for the event
      if (!this.voicesLoaded) {
        this.synthesis.addEventListener('voiceschanged', loadVoicesIfAvailable);
        
        // Fallback timeout in case voices never load
        setTimeout(() => {
          if (!this.voicesLoaded) {
            console.warn('⚠️ [Browser] Voice loading timeout, proceeding with default voice');
            this.voicesLoaded = true;
            resolve();
          }
        }, 2000);
      }
    });
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<ArrayBuffer> {
    try {
      console.log(`🎵 [Browser] Synthesizing: "${text.substring(0, 50)}..."`);
      
      // Ensure voices are loaded
      if (!this.voicesLoaded) {
        await this.loadVoices();
      }

      // Create speech utterance
      const utterance = new SpeechSynthesisUtterance(text.trim());
      
      // Configure voice settings
      this.configureUtterance(utterance, options);
      
      // Convert to ArrayBuffer using audio recording
      const arrayBuffer = await this.synthesizeToArrayBuffer(utterance);
      
      console.log(`✅ [Browser] Synthesis completed: ${arrayBuffer.byteLength} bytes`);
      return arrayBuffer;

    } catch (error) {
      console.error('❌ [Browser] Synthesis failed:', error);
      throw new Error(`Browser TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private configureUtterance(utterance: SpeechSynthesisUtterance, options: TTSOptions): void {
    // Set voice if specified and available
    if (options.voice) {
      const voice = this.findVoice(options.voice);
      if (voice) {
        utterance.voice = voice;
      }
    }

    // Set speech parameters
    utterance.rate = Math.max(0.1, Math.min(2.0, options.rate || 1.0));
    utterance.pitch = 1.0; // Browser TTS typically has limited pitch control
    utterance.volume = Math.max(0.0, Math.min(1.0, options.volume || 0.8));
  }

  private findVoice(voiceName: string): SpeechSynthesisVoice | null {
    // Try exact match first
    let voice = this.voices.find(v => 
      v.name.toLowerCase() === voiceName.toLowerCase()
    );

    if (!voice) {
      // Try partial match
      voice = this.voices.find(v => 
        v.name.toLowerCase().includes(voiceName.toLowerCase())
      );
    }

    if (!voice) {
      // Try to find a good default English voice
      voice = this.voices.find(v => 
        v.lang.startsWith('en') && v.default
      ) || this.voices.find(v => 
        v.lang.startsWith('en')
      );
    }

    if (voice) {
      console.log(`🎵 [Browser] Using voice: ${voice.name} (${voice.lang})`);
    } else {
      console.warn(`⚠️ [Browser] Voice "${voiceName}" not found, using default`);
    }

    return voice;
  }

  private async synthesizeToArrayBuffer(utterance: SpeechSynthesisUtterance): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      // Set up audio recording to capture the speech synthesis
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const mediaStreamDestination = audioContext.createMediaStreamDestination();
      const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);
      const audioChunks: Blob[] = [];

      // Configure media recorder
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      });

      mediaRecorder.addEventListener('stop', async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          resolve(arrayBuffer);
        } catch (error) {
          reject(error);
        }
      });

      // Set up utterance events
      utterance.addEventListener('start', () => {
        console.log('🎵 [Browser] Speech synthesis started');
        mediaRecorder.start();
      });

      utterance.addEventListener('end', () => {
        console.log('🎵 [Browser] Speech synthesis ended');
        mediaRecorder.stop();
      });

      utterance.addEventListener('error', (event) => {
        console.error('❌ [Browser] Speech synthesis error:', event.error);
        mediaRecorder.stop();
        reject(new Error(`Speech synthesis error: ${event.error}`));
      });

      // Start synthesis
      try {
        // Cancel any ongoing synthesis
        this.synthesis.cancel();
        
        // Start new synthesis
        this.synthesis.speak(utterance);
        
        // Timeout fallback
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            console.warn('⚠️ [Browser] Synthesis timeout, stopping recording');
            mediaRecorder.stop();
            reject(new Error('Speech synthesis timed out'));
          }
        }, 30000); // 30 second timeout
        
      } catch (error) {
        reject(error);
      }
    });
  }

  async test(): Promise<void> {
    try {
      console.log('🧪 [Browser] Testing TTS service...');
      
      // Check if speech synthesis is available
      if (!this.synthesis) {
        throw new Error('Speech synthesis not supported in this browser');
      }
      
      // Test with minimal synthesis
      await this.synthesize('Test');
      
      console.log('✅ [Browser] TTS service test passed');
      
    } catch (error) {
      console.error('❌ [Browser] TTS service test failed:', error);
      throw new Error(`Browser TTS test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel any ongoing speech synthesis
   */
  cancel(): void {
    this.synthesis.cancel();
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
}

/**
 * Factory function to create browser TTS provider
 */
export const createBrowserTTSProvider = (): BrowserTTSProvider => {
  return new BrowserTTSProvider();
};