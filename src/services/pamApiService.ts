import { API_BASE_URL } from './api';

export interface PamApiMessage {
  message: string;
  user_id: string;
  context?: {
    region?: string;
    current_page?: string;
    session_data?: any;
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
  
  public static getInstance(): PamApiService {
    if (!PamApiService.instance) {
      PamApiService.instance = new PamApiService();
    }
    return PamApiService.instance;
  }

  async sendMessage(message: PamApiMessage, token?: string): Promise<PamApiResponse> {
    const endpoints = [
      `${API_BASE_URL}/api/v1/pam/chat`,
      'https://treflip2025.app.n8n.cloud/webhook/4cd18979-6ee8-451e-b4e6-095c3d7ca31a'
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
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(message),
          signal: AbortSignal.timeout(15000) // 15 second timeout
        });

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