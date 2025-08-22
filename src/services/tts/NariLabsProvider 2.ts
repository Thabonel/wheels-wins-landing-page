import { TTSProvider, TTSOptions } from '../VoiceOrchestrator';

/**
 * Nari Labs TTS Provider - Primary provider for PAM
 * Maintains compatibility with existing PAM backend integration
 */
export class NariLabsProvider implements TTSProvider {
  name = 'NariLabs';
  priority = 1; // Highest priority (primary provider)
  
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey || '';
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<ArrayBuffer> {
    try {
      console.log(`🎵 [NariLabs] Synthesizing: "${text.substring(0, 50)}..."`);
      
      // Use existing PAM backend endpoint for Nari Labs TTS
      const response = await fetch(`${this.baseUrl}/api/v1/tts/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: options.voice || 'alloy',
          rate: options.rate || 1.0,
          volume: options.volume || 0.8,
          format: options.format || 'mp3',
          streaming: options.streaming || false,
        }),
        // Timeout for TTS requests (important for fallback logic)
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Nari Labs TTS failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Nari Labs returned empty audio data');
      }

      console.log(`✅ [NariLabs] Synthesis completed: ${arrayBuffer.byteLength} bytes`);
      return arrayBuffer;

    } catch (error) {
      console.error('❌ [NariLabs] Synthesis failed:', error);
      
      // Enhance error messages for better debugging
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Nari Labs TTS service unavailable (network error)');
      }
      
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('Nari Labs TTS request timed out');
      }
      
      throw error;
    }
  }

  async test(): Promise<void> {
    try {
      console.log('🧪 [NariLabs] Testing TTS service...');
      
      // Test with minimal text to verify service is available
      await this.synthesize('Test', { voice: 'alloy' });
      
      console.log('✅ [NariLabs] TTS service test passed');
      
    } catch (error) {
      console.error('❌ [NariLabs] TTS service test failed:', error);
      throw new Error(`Nari Labs TTS service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Factory function to create Nari Labs provider with PAM backend integration
 */
export const createNariLabsProvider = (): NariLabsProvider => {
  // Use the same backend URL that PAM is already using
  const backendUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com';
  const apiKey = import.meta.env.VITE_NARI_LABS_API_KEY;
  
  return new NariLabsProvider(backendUrl, apiKey);
};