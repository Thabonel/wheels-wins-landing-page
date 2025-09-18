/**
 * PAM Service - Unified Service Layer
 * Consolidates:
 * - pamService.ts (config)
 * - pamApiService.ts (HTTP API calls)
 * - pamConnectionService.ts (connection management)
 *
 * Features:
 * ✅ Environment-aware endpoint selection
 * ✅ Circuit breaker pattern for resilience
 * ✅ Location context enhancement
 * ✅ Connection health monitoring
 * ✅ Retry logic with exponential backoff
 * ✅ Fallback endpoint support
 * ✅ Performance metrics
 */

import { API_BASE_URL } from './api';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { getPamLocationContext, formatLocationForPam } from '@/utils/pamLocationContext';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES & INTERFACES
// =====================================================

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

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  lastError?: string;
  retryCount: number;
  backend: 'production' | 'staging' | 'fallback' | 'offline';
  latency?: number;
  healthScore: number;
}

export interface PamServiceMetrics {
  requestCount: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
  uptime: number;
  lastHealthCheck: number;
}

// =====================================================
// CONFIGURATION
// =====================================================

export const PAM_CONFIG = {
  // Environment-aware endpoint selection
  WEBSOCKET_ENDPOINTS: {
    production: [
      'wss://pam-backend.onrender.com',
      'wss://api.wheelsandwins.com/pam',
    ],
    staging: [
      'wss://wheels-wins-backend-staging.onrender.com',
    ]
  },

  HTTP_ENDPOINTS: {
    production: [
      `${API_BASE_URL}/api/v1/pam/chat`,
      'https://api.wheelsandwins.com/pam/chat'
    ],
    staging: [
      'https://wheels-wins-backend-staging.onrender.com/api/v1/pam/chat'
    ]
  },

  // Connection settings
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000,
  HEARTBEAT_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 15000,
  HEALTH_CHECK_INTERVAL: 60000,

  // Circuit breaker settings
  CIRCUIT_BREAKER: {
    failureThreshold: 3,
    cooldownPeriod: 30000,
    timeout: 15000
  }
};

// =====================================================
// PAM SERVICE CLASS
// =====================================================

class PamService {
  private static instance: PamService;
  private breaker: CircuitBreaker;
  private status: ConnectionStatus;
  private metrics: PamServiceMetrics;
  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  private healthCheckInterval?: NodeJS.Timeout;
  private retryTimeout?: NodeJS.Timeout;
  private currentEndpointIndex = 0;

  private constructor() {
    this.breaker = new CircuitBreaker(
      (url: RequestInfo, options?: RequestInit) => fetch(url, options),
      PAM_CONFIG.CIRCUIT_BREAKER
    );

    this.status = {
      isConnected: false,
      isConnecting: false,
      retryCount: 0,
      backend: this.getEnvironment(),
      healthScore: 100
    };

    this.metrics = {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      averageLatency: 0,
      uptime: 0,
      lastHealthCheck: 0
    };

    this.startHealthChecking();
  }

  public static getInstance(): PamService {
    if (!PamService.instance) {
      PamService.instance = new PamService();
    }
    return PamService.instance;
  }

  // =====================================================
  // ENVIRONMENT DETECTION
  // =====================================================

  private getEnvironment(): 'production' | 'staging' {
    // Environment-aware detection (prevents staging→production contamination)
    const isProduction = window.location.hostname === 'wheelsandwins.com';
    return isProduction ? 'production' : 'staging';
  }

  private getCurrentEndpoints(): string[] {
    const env = this.getEnvironment();
    return PAM_CONFIG.HTTP_ENDPOINTS[env] || PAM_CONFIG.HTTP_ENDPOINTS.staging;
  }

  // =====================================================
  // CONNECTION MANAGEMENT
  // =====================================================

  async connect(): Promise<boolean> {
    if (this.status.isConnecting) {
      logger.debug('Already connecting to PAM backend...');
      return false;
    }

    this.updateStatus({ isConnecting: true, lastError: undefined });

    try {
      const success = await this.testConnection();
      if (success) {
        this.updateStatus({
          isConnected: true,
          isConnecting: false,
          retryCount: 0,
          healthScore: 100
        });
        logger.info(`✅ Connected to PAM backend (${this.getEnvironment()})`);
        return true;
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus({
        isConnected: false,
        isConnecting: false,
        lastError: errorMessage,
        healthScore: Math.max(0, this.status.healthScore - 20)
      });
      logger.error(`❌ Failed to connect to PAM backend: ${errorMessage}`);

      // Schedule retry if not exceeded attempts
      if (this.status.retryCount < PAM_CONFIG.RECONNECT_ATTEMPTS) {
        this.scheduleRetry();
      }

      return false;
    }
  }

  private scheduleRetry(): void {
    const delay = PAM_CONFIG.RECONNECT_DELAY * Math.pow(2, this.status.retryCount);
    logger.info(`🔄 Retrying PAM connection in ${delay}ms (attempt ${this.status.retryCount + 1}/${PAM_CONFIG.RECONNECT_ATTEMPTS})`);

    this.retryTimeout = setTimeout(() => {
      this.updateStatus({ retryCount: this.status.retryCount + 1 });
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = undefined;
    }

    this.updateStatus({
      isConnected: false,
      isConnecting: false,
      retryCount: 0
    });

    logger.info('🔌 Disconnected from PAM backend');
  }

  // =====================================================
  // HTTP API METHODS
  // =====================================================

  async sendMessage(message: PamApiMessage, token?: string): Promise<PamApiResponse> {
    const startTime = Date.now();
    this.metrics.requestCount++;

    try {
      // Enhance message with location context
      const enhancedMessage = await this.enhanceMessageWithLocation(message);
      const endpoints = this.getCurrentEndpoints();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Environment': this.getEnvironment(),
        'X-Client': 'wheels-wins-frontend'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Try each endpoint until one succeeds
      let lastError: Error | null = null;
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
            const latency = Date.now() - startTime;

            // Update metrics
            this.metrics.successCount++;
            this.metrics.averageLatency = (
              (this.metrics.averageLatency * (this.metrics.successCount - 1) + latency) /
              this.metrics.successCount
            );

            this.updateStatus({
              isConnected: true,
              latency,
              healthScore: Math.min(100, this.status.healthScore + 5)
            });

            console.log(`✅ PAM HTTP response from ${endpoint} (${latency}ms):`, data);
            return data;
          } else {
            const errorText = await response.text();
            lastError = new Error(`HTTP ${response.status}: ${errorText}`);
            console.warn(`❌ PAM HTTP endpoint ${endpoint} returned status ${response.status}: ${errorText}`);
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(`❌ PAM HTTP endpoint ${endpoint} failed:`, error);
          continue;
        }
      }

      // All endpoints failed
      this.metrics.failureCount++;
      this.updateStatus({
        isConnected: false,
        lastError: lastError?.message,
        healthScore: Math.max(0, this.status.healthScore - 10)
      });

      throw new Error(`All PAM HTTP endpoints failed. Last error: ${lastError?.message}`);

    } catch (error) {
      this.metrics.failureCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ PAM sendMessage failed:', error);

      this.updateStatus({
        isConnected: false,
        lastError: errorMessage,
        healthScore: Math.max(0, this.status.healthScore - 10)
      });

      throw error;
    }
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
            userLocation: locationContext,
            // Add environment context
            environment: this.getEnvironment(),
            timestamp: Date.now()
          }
        };
      } else {
        console.log('🌍 No location context available for PAM');
        return {
          ...message,
          context: {
            ...message.context,
            environment: this.getEnvironment(),
            timestamp: Date.now()
          }
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to enhance message with location:', error);
      return {
        ...message,
        context: {
          ...message.context,
          environment: this.getEnvironment(),
          timestamp: Date.now()
        }
      };
    }
  }

  // =====================================================
  // HEALTH MONITORING
  // =====================================================

  async testConnection(): Promise<boolean> {
    const startTime = Date.now();
    try {
      const response = await this.sendMessage({
        message: 'ping',
        user_id: 'health-check'
      });

      const latency = Date.now() - startTime;
      this.metrics.lastHealthCheck = Date.now();

      this.updateStatus({
        latency,
        healthScore: Math.min(100, this.status.healthScore + 2)
      });

      return !!response && !response.error;
    } catch (error) {
      console.error('❌ PAM health check failed:', error);
      this.updateStatus({
        healthScore: Math.max(0, this.status.healthScore - 5)
      });
      return false;
    }
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(() => {
      if (this.status.isConnected) {
        this.testConnection();
      }
    }, PAM_CONFIG.HEALTH_CHECK_INTERVAL);
  }

  private stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  // =====================================================
  // STATUS MANAGEMENT
  // =====================================================

  private updateStatus(updates: Partial<ConnectionStatus>): void {
    this.status = { ...this.status, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('Error in PAM status listener:', error);
      }
    });
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  getMetrics(): PamServiceMetrics {
    return { ...this.metrics };
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  // Get current configuration
  getConfig() {
    return PAM_CONFIG;
  }

  // Get current environment
  getCurrentEnvironment() {
    return this.getEnvironment();
  }

  // Cleanup
  destroy(): void {
    this.disconnect();
    this.stopHealthChecking();
    this.listeners.clear();
  }
}

// =====================================================
// EXPORTS
// =====================================================

export const pamService = PamService.getInstance();
export { PAM_CONFIG };
export default pamService;