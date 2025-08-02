
import { apiFetch } from '@/services/api';
export interface VoiceSettings {
  enabled: boolean;
  autoPlay: boolean;
  speed: number;
  volume: number;
  voice: string;
}

export interface VoiceGenerationOptions {
  text: string;
  emotion?: 'excited' | 'helpful' | 'calm' | 'celebrates';
  context?: 'shopping' | 'planning' | 'achievement' | 'safety' | 'general';
  priority?: 'high' | 'normal' | 'low';
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface VoiceResponse {
  audioUrl: string;
  duration: number;
  cached: boolean;
}

class PamVoiceService {
  private cache = new Map<string, { url: string; timestamp: number; duration: number }>();
  private activeBlobUrls = new Set<string>();
  private queue: VoiceGenerationOptions[] = [];
  private isGenerating = false;
  private readonly cacheExpiry = 5 * 60 * 1000; // 5 minutes - shorter to avoid stale blob URLs

  constructor() {
    this.cleanExpiredCache();
    // Clean up blob URLs on page unload
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  async generateVoice(options: VoiceGenerationOptions): Promise<VoiceResponse> {
    const cacheKey = this.getCacheKey(options);
    
    // Skip cache for now due to blob URL expiration issues
    // TODO: Implement persistent caching with IndexedDB or service worker
    /*
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return {
        audioUrl: cached.url,
        duration: cached.duration,
        cached: true
      };
    }
    */

    // Format text for Nari Labs Dia
    const formattedText = this.formatTextForTTS(options.text, options.emotion, options.context);

    try {
      const response = await apiFetch('/api/v1/pam/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: formattedText,
          temperature: 1.1,
          cfg_scale: 3,
          speed_factor: options.rate || 0.96,
          max_new_tokens: 2048,
          voice: options.voice || 'en-US-AriaNeural',
          pitch: options.pitch || 1.0,
          volume: options.volume || 1.0
        })
      });

      if (!response.ok) {
        throw new Error(`Voice generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate audio data exists
      if (!data.audio || !Array.isArray(data.audio) || data.audio.length === 0) {
        throw new Error('Invalid audio data received from server');
      }
      
      // Determine audio type based on the first few bytes or assume MP3 for Edge TTS
      const audioType = data.audio.length > 0 && data.audio[0] === 255 && data.audio[1] === 251 ? 'audio/mpeg' : 'audio/wav';
      const audioBlob = new Blob([new Uint8Array(data.audio)], { type: audioType });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Track active blob URL for cleanup
      this.activeBlobUrls.add(audioUrl);

      // Don't cache blob URLs as they expire - just return fresh ones
      // TODO: Implement IndexedDB caching for persistent storage

      return {
        audioUrl,
        duration: data.duration || 0,
        cached: false
      };

    } catch (error) {
      console.error('Voice generation error:', error);
      throw error;
    }
  }

  private formatTextForTTS(text: string, emotion?: string, context?: string): string {
    // Remove [S1] tag as it's being spoken literally by TTS
    // Just return clean text - the emotion/context will be handled by voice selection
    return text.trim();
  }

  private getCacheKey(options: VoiceGenerationOptions): string {
    return `${options.text}_${options.emotion || 'none'}_${options.context || 'general'}`;
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        URL.revokeObjectURL(value.url);
        this.cache.delete(key);
      }
    }
  }

  clearCache(): void {
    for (const [key, value] of this.cache.entries()) {
      URL.revokeObjectURL(value.url);
    }
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  cleanup(): void {
    // Clean up all active blob URLs
    this.activeBlobUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('Failed to revoke blob URL:', error);
      }
    });
    this.activeBlobUrls.clear();
    this.clearCache();
  }

  // Method to manually revoke a specific blob URL after use
  revokeBlobUrl(url: string): void {
    if (this.activeBlobUrls.has(url)) {
      try {
        URL.revokeObjectURL(url);
        this.activeBlobUrls.delete(url);
      } catch (error) {
        console.warn('Failed to revoke specific blob URL:', error);
      }
    }
  }
}

export const pamVoiceService = new PamVoiceService();
