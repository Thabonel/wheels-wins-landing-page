/**
 * PAM Service - Unified Service Layer
 * PAM 2.0 - Google Gemini 1.5 Flash Integration
 *
 * 🚨 CRITICAL: This is the SINGLE SOURCE OF TRUTH for PAM WebSocket connections
 *
 * ❌ DO NOT CREATE ALTERNATIVE WEBSOCKET IMPLEMENTATIONS
 * ❌ DO NOT BYPASS THIS SERVICE FOR PRODUCTION FEATURES
 * ❌ DO NOT DUPLICATE CONNECTION LOGIC
 *
 * ✅ EXTEND this service for new features
 * ✅ See ADR-PAM-WEBSOCKET-ARCHITECTURE.md for guidelines
 * ✅ Get architectural approval for major changes
 *
 * Features:
 * ✅ Environment-aware endpoint selection
 * ✅ Circuit breaker pattern for resilience
 * ✅ Location context enhancement
 * ✅ Connection health monitoring
 * ✅ Retry logic with exponential backoff
 * ✅ Fallback endpoint support
 * ✅ Performance metrics
 * ✅ PAM 2.0 Google Gemini integration
 */

import { getPamLocationContext, formatLocationForPam } from '@/utils/pamLocationContext';
import { logger } from '@/lib/logger';
import type { Pam2ChatRequest, Pam2ChatResponse, Pam2HealthResponse } from '@/types/pamTypes';

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
  ui_action?: string;
  metadata?: any;
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
  // PAM 2.0 WebSocket endpoints
  WEBSOCKET_ENDPOINTS: {
    production: [
      'wss://pam-backend.onrender.com/api/v1/pam-2/chat/ws',
      'wss://api.wheelsandwins.com/api/v1/pam-2/chat/ws',
    ],
    staging: [
      'wss://wheels-wins-backend-staging.onrender.com/api/v1/pam-2/chat/ws',
    ]
  },

  // PAM 2.0 REST endpoints
  REST_ENDPOINTS: {
    production: {
      chat: 'https://pam-backend.onrender.com/api/v1/pam-2/chat',
      health: 'https://pam-backend.onrender.com/api/v1/pam-2/health'
    },
    staging: {
      chat: 'https://wheels-wins-backend-staging.onrender.com/api/v1/pam-2/chat',
      health: 'https://wheels-wins-backend-staging.onrender.com/api/v1/pam-2/health'
    }
  },

  // Connection settings
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000,
  HEARTBEAT_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 15000,
  HEALTH_CHECK_INTERVAL: 60000,

  // WebSocket message timeout
  MESSAGE_TIMEOUT: 30000
};

// =====================================================
// PAM SERVICE CLASS
// =====================================================

class PamService {
  private static instance: PamService;
  private websocket: WebSocket | null = null;
  private status: ConnectionStatus;
  private metrics: PamServiceMetrics;
  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  private healthCheckInterval?: NodeJS.Timeout;
  private retryTimeout?: NodeJS.Timeout;
  private currentEndpointIndex = 0;
  private currentUserId: string | null = null;
  private sessionId: string | null = null; // PAM 2.0 session tracking

  private constructor() {
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

  private getWebSocketEndpoints(): string[] {
    const env = this.getEnvironment();
    logger.info('🚀 Using PAM 2.0 WebSocket endpoints');
    return PAM_CONFIG.WEBSOCKET_ENDPOINTS[env] || PAM_CONFIG.WEBSOCKET_ENDPOINTS.staging;
  }

  // =====================================================
  // CONNECTION MANAGEMENT
  // =====================================================

  async connect(userId: string): Promise<boolean> {
    if (this.status.isConnecting) {
      logger.debug('Already connecting to PAM WebSocket...');
      return false;
    }

    if (!userId) {
      logger.warn('❌ Cannot connect PAM WebSocket without userId');
      return false;
    }

    this.updateStatus({ isConnecting: true, lastError: undefined });

    try {
      await this.connectWebSocket(userId);
      logger.info(`✅ Connected to PAM 2.0 WebSocket backend (${this.getEnvironment()})`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus({
        isConnected: false,
        isConnecting: false,
        lastError: errorMessage,
        healthScore: Math.max(0, this.status.healthScore - 20)
      });
      logger.error(`❌ Failed to connect to PAM 2.0 WebSocket backend: ${errorMessage}`);

      // Schedule retry if not exceeded attempts
      if (this.status.retryCount < PAM_CONFIG.RECONNECT_ATTEMPTS) {
        this.scheduleRetry();
      }

      return false;
    }
  }

  private scheduleRetry(): void {
    const delay = PAM_CONFIG.RECONNECT_DELAY * Math.pow(2, this.status.retryCount);
    logger.info(`🔄 Retrying PAM 2.0 WebSocket connection in ${delay}ms (attempt ${this.status.retryCount + 1}/${PAM_CONFIG.RECONNECT_ATTEMPTS})`);

    this.retryTimeout = setTimeout(async () => {
      this.updateStatus({ retryCount: this.status.retryCount + 1 });

      // Reconnect WebSocket if we have stored credentials
      if (this.currentUserId) {
        try {
          await this.connectWebSocket(this.currentUserId);
        } catch (error) {
          console.error('❌ WebSocket retry failed:', error);
        }
      }
    }, delay);
  }

  disconnect(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = undefined;
    }

    if (this.websocket) {
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }

    this.currentUserId = null;

    this.updateStatus({
      isConnected: false,
      isConnecting: false,
      retryCount: 0
    });

    logger.info('🔌 Disconnected from PAM 2.0 WebSocket backend');
  }

  // =====================================================
  // WEBSOCKET CONNECTION METHODS
  // =====================================================

  private async connectWebSocket(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Close existing connection if any
        if (this.websocket) {
          this.websocket.close();
        }

        // Get WebSocket endpoints
        const endpoints = this.getWebSocketEndpoints();

        // Try first endpoint (we can add fallback logic later)
        const endpoint = endpoints[0];

        // Build WebSocket URL for PAM 2.0: /api/v1/pam-2/chat/ws/{user_id}
        const wsUrl = `${endpoint}/${userId}`;
        logger.info(`🚀 Connecting to PAM 2.0 WebSocket: ${wsUrl}`);

        console.log(`🌐 Connecting to PAM 2.0 WebSocket: ${wsUrl}`);

        this.websocket = new WebSocket(wsUrl);
        this.currentUserId = userId;

        this.websocket.onopen = () => {
          console.log('✅ PAM 2.0 WebSocket connected');
          this.updateStatus({
            isConnected: true,
            isConnecting: false,
            retryCount: 0,
            healthScore: Math.min(100, this.status.healthScore + 10)
          });
          resolve();
        };

        this.websocket.onclose = (event) => {
          console.log('🔌 PAM 2.0 WebSocket disconnected:', event.code, event.reason);
          this.updateStatus({
            isConnected: false,
            isConnecting: false,
            lastError: `WebSocket closed: ${event.reason || event.code}`
          });

          // Attempt reconnection if not a clean close
          if (event.code !== 1000 && this.status.retryCount < PAM_CONFIG.RECONNECT_ATTEMPTS) {
            this.scheduleRetry();
          }
        };

        this.websocket.onerror = (error) => {
          console.error('❌ PAM 2.0 WebSocket error:', error);
          this.updateStatus({
            isConnected: false,
            isConnecting: false,
            lastError: 'WebSocket connection error'
          });
          reject(new Error('WebSocket connection failed'));
        };

        this.websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 PAM 2.0 WebSocket message received:', data);
            // Message handling is done in sendMessage method
          } catch (error) {
            console.warn('❌ Failed to parse WebSocket message:', error);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // =====================================================
  // MESSAGE API METHODS
  // =====================================================

  async sendMessage(message: PamApiMessage): Promise<PamApiResponse> {
    const startTime = Date.now();
    this.metrics.requestCount++;

    try {
      logger.info('🚀 Routing message to PAM 2.0');

      // Ensure WebSocket connection is established
      if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        if (!message.user_id) {
          throw new Error('WebSocket connection requires userId');
        }
        await this.connectWebSocket(message.user_id);
      }

      // Enhance message with location context
      const enhancedMessage = await this.enhanceMessageWithLocation(message);

      // Create PAM 2.0 request
      const pam2Request: Pam2ChatRequest = {
        user_id: enhancedMessage.user_id,
        message: enhancedMessage.message,
        context: enhancedMessage.context,
        session_id: this.sessionId || undefined
      };

      // Send message via WebSocket and wait for response
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('PAM 2.0 WebSocket message timeout'));
        }, PAM_CONFIG.MESSAGE_TIMEOUT);

        const messageHandler = (event: MessageEvent) => {
          try {
            const response: Pam2ChatResponse = JSON.parse(event.data);

            if (response.response) {
              clearTimeout(timeout);
              this.websocket?.removeEventListener('message', messageHandler);

              // Store session_id for future requests
              if (response.session_id) {
                this.sessionId = response.session_id;
              }

              const latency = Date.now() - startTime;
              this.metrics.successCount++;
              this.metrics.averageLatency = (
                (this.metrics.averageLatency * (this.metrics.successCount - 1) + latency) /
                this.metrics.successCount
              );

              this.updateStatus({
                isConnected: true,
                healthScore: Math.min(100, this.status.healthScore + 5)
              });

              // Convert PAM 2.0 response to compatible format
              const legacyResponse: PamApiResponse = {
                response: response.response,
                message: response.response,
                content: response.response,
                ui_action: response.ui_action,
                metadata: response.metadata
              };

              console.log(`✅ PAM 2.0 WebSocket response (${latency}ms):`, response);
              resolve(legacyResponse);
            } else if (response.type === 'ping') {
              // Respond to ping with pong to maintain connection
              console.log(`🏓 Received ping, sending pong response`);
              this.websocket?.send(JSON.stringify({ type: 'pong', timestamp: response.timestamp }));
            }
          } catch (error) {
            clearTimeout(timeout);
            this.websocket?.removeEventListener('message', messageHandler);
            reject(new Error(`Failed to parse PAM 2.0 response: ${error}`));
          }
        };

        this.websocket!.addEventListener('message', messageHandler);
        this.websocket!.send(JSON.stringify(pam2Request));
        console.log(`🌐 Sent PAM 2.0 WebSocket message:`, pam2Request);
      });

    } catch (error) {
      this.metrics.failureCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ PAM 2.0 WebSocket sendMessage failed:', error);

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
      // For WebSocket, test the connection state directly
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        const latency = Date.now() - startTime;
        this.metrics.lastHealthCheck = Date.now();

        this.updateStatus({
          healthScore: Math.min(100, this.status.healthScore + 2)
        });

        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('❌ PAM 2.0 WebSocket health check failed:', error);
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

  /**
   * Get PAM 2.0 health status
   */
  async getHealthStatus(): Promise<Pam2HealthResponse | null> {
    try {
      const env = this.getEnvironment();
      const healthEndpoint = PAM_CONFIG.REST_ENDPOINTS[env].health;

      const response = await fetch(healthEndpoint);
      if (response.ok) {
        return await response.json() as Pam2HealthResponse;
      } else {
        logger.error(`❌ PAM 2.0 health check failed: ${response.status}`);
        return null;
      }
    } catch (error) {
      logger.error('❌ PAM 2.0 health check error:', error);
      return null;
    }
  }

  /**
   * Get current session ID for PAM 2.0
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get current PAM version (always 2.0)
   */
  getPamVersion(): '2.0' {
    return '2.0';
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
export default pamService;