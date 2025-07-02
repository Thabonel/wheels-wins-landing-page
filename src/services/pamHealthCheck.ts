import { API_BASE_URL } from './api';

export interface HealthCheckResult {
  status: 'online' | 'offline' | 'error';
  endpoint: string;
  responseTime: number;
  error?: string;
}

export class PamHealthCheckService {
  private static instance: PamHealthCheckService;
  
  public static getInstance(): PamHealthCheckService {
    if (!PamHealthCheckService.instance) {
      PamHealthCheckService.instance = new PamHealthCheckService();
    }
    return PamHealthCheckService.instance;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    const endpoints = [
      `${API_BASE_URL}/health`,
      `${API_BASE_URL}/`,
      `${API_BASE_URL}/status`,
      'https://treflip2025.app.n8n.cloud/webhook/health'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🏥 Checking PAM health: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        const responseTime = Date.now() - startTime;

        if (response.ok) {
          return {
            status: 'online',
            endpoint,
            responseTime
          };
        }
      } catch (error) {
        console.warn(`❌ Health check failed for ${endpoint}:`, error);
      }
    }

    return {
      status: 'offline',
      endpoint: API_BASE_URL,
      responseTime: Date.now() - startTime,
      error: 'All endpoints unreachable'
    };
  }

  async pingWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws/health-check';
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      } catch (error) {
        resolve(false);
      }
    });
  }
}

export const pamHealthCheck = PamHealthCheckService.getInstance();