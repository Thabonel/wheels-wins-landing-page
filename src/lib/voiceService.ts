
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
}

export interface VoiceResponse {
  audioUrl: string;
  duration: number;
  cached: boolean;
}

class PamVoiceService {
  private cache = new Map<string, { url: string; timestamp: number; duration: number }>();
  private queue: VoiceGenerationOptions[] = [];
  private isGenerating = false;
  private readonly cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.cleanExpiredCache();
  }

  async generateVoice(options: VoiceGenerationOptions): Promise<VoiceResponse> {
    const cacheKey = this.getCacheKey(options);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return {
        audioUrl: cached.url,
        duration: cached.duration,
        cached: true
      };
    }

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
          speed_factor: 0.96,
          max_new_tokens: 2048
        })
      });

      if (!response.ok) {
        throw new Error(`Voice generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      const audioBlob = new Blob([new Uint8Array(data.audio)], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Cache the result
      this.cache.set(cacheKey, {
        url: audioUrl,
        timestamp: Date.now(),
        duration: data.duration || 0
      });

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
    let formattedText = `[S1] ${text}`;

    // Add emotional cues based on emotion and context
    if (emotion) {
      switch (emotion) {
        case 'excited':
          formattedText = `[S1] (excited) ${text}`;
          break;
        case 'helpful':
          formattedText = `[S1] (helpful) ${text}`;
          break;
        case 'calm':
          formattedText = `[S1] (calm and reassuring) ${text}`;
          break;
        case 'celebrates':
          formattedText = `[S1] (celebrates) ${text}`;
          break;
      }
    }

    // Add context-specific personality
    if (context === 'shopping' && !emotion) {
      formattedText = `[S1] (excited) ${text}`;
    } else if (context === 'safety' && !emotion) {
      formattedText = `[S1] (calm and reassuring) ${text}`;
    }

    return formattedText;
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
}

export const pamVoiceService = new PamVoiceService();
