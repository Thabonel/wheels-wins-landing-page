import { API_BASE_URL } from './api';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { getPamLocationContext, formatLocationForPam } from '@/utils/pamLocationContext';

export interface PamApiMessage {
  message: string;
  user_id: string;
  context?: {
    region?: string;
    current_page?: string;
    session_data?: any;
    location?: any;
    userLocation?: any;
  };
}

export interface PamApiResponse {
  response?: string;
  message?: string;
  content?: string;
  error?: string;
}

export class PamApiService {
  private static instance: PamApiService;
  private breaker: CircuitBreaker;

  private constructor() {
    this.breaker = new CircuitBreaker(
      (url: RequestInfo, options?: RequestInit) => fetch(url, options),
      { failureThreshold: 3, cooldownPeriod: 30000, timeout: 15000 }
    );
  }

  public static getInstance(): PamApiService {
    if (!PamApiService.instance) {
      PamApiService.instance = new PamApiService();
    }
    return PamApiService.instance;
  }

  async sendMessage(message: PamApiMessage, token?: string): Promise<PamApiResponse> {
    // Enhance message with location context
    const enhancedMessage = await this.enhanceMessageWithLocation(message);
    const endpoints = [
      `${API_BASE_URL}/api/v1/pam/chat`,
      // n8n webhook discontinued - removed n8n endpoint
    ];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    for (const endpoint of endpoints) {
      try {
        console.log(`🌐 Trying PAM HTTP endpoint: ${endpoint}`);
        
        const response = await this.breaker.call(
          endpoint,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(enhancedMessage)
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ PAM HTTP response from ${endpoint}:`, data);
          return data;
        } else {
          console.warn(`❌ PAM HTTP endpoint ${endpoint} returned status ${response.status}`);
        }
      } catch (error) {
        console.warn(`❌ PAM HTTP endpoint ${endpoint} failed:`, error);
        continue;
      }
    }

    throw new Error('All PAM HTTP endpoints failed');
  }

  private async enhanceMessageWithLocation(message: PamApiMessage): Promise<PamApiMessage> {
    try {
      console.log('🌍 Enhancing PAM message with location context...');

      // Get location context for this user
      const locationContext = await getPamLocationContext(message.user_id);

      if (locationContext) {
        const locationData = formatLocationForPam(locationContext);
        console.log(`📍 Adding location to PAM: ${locationContext.city}, ${locationContext.country} (${locationContext.source})`);

        return {
          ...message,
          context: {
            ...message.context,
            ...locationData,
            // Also add as userLocation for backward compatibility
            userLocation: locationContext
          }
        };
      } else {
        console.log('🌍 No location context available for PAM');
        return message;
      }
    } catch (error) {
      console.warn('⚠️ Failed to enhance message with location:', error);
      return message;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendMessage({
        message: 'ping',
        user_id: 'health-check'
      });
      return !!response;
    } catch (error) {
      console.error('❌ PAM API health check failed:', error);
      return false;
    }
  }
}

export const pamApiService = PamApiService.getInstance();