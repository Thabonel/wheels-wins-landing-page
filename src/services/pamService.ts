/**
 * PAM Service - Unified Service Layer
 * PAM 2.0 - Google Gemini 1.5 Flash Integration
 *
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for PAM WebSocket connections
 *
 * DO NOT CREATE ALTERNATIVE WEBSOCKET IMPLEMENTATIONS
 * DO NOT BYPASS THIS SERVICE FOR PRODUCTION FEATURES
 * DO NOT DUPLICATE CONNECTION LOGIC
 *
 * EXTEND this service for new features
 * See ADR-PAM-WEBSOCKET-ARCHITECTURE.md for guidelines
 * Get architectural approval for major changes
 *
 * Features:
 * - Environment-aware endpoint selection
 * - Circuit breaker pattern for resilience
 * - Location context enhancement
 * - Connection health monitoring
 * - Retry logic with exponential backoff
 * - Fallback endpoint support
 * - Performance metrics
 * - PAM 2.0 Google Gemini integration
 */

import { getPamLocationContext, formatLocationForPam } from '@/utils/pamLocationContext';
import { logger } from '@/lib/logger';
import type { Pam2ChatRequest, Pam2ChatResponse, Pam2HealthResponse } from '@/types/pamTypes';
import { MessageQueue, type QueuedMessage } from '@/utils/messageQueue';

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
  // PAM 2.0 WebSocket endpoints (with Redis caching for performance)
  WEBSOCKET_ENDPOINTS: {
    production: [
      'wss://pam-backend.onrender.com/api/v1/pam/ws',
      'wss://api.wheelsandwins.com/api/v1/pam/ws',
    ],
    staging: [
      'wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws',
    ]
  },

  // PAM 2.0 REST endpoints (with Redis caching for performance)
  REST_ENDPOINTS: {
    production: {
      primary: {
        chat: 'https://pam-backend.onrender.com/api/v1/pam-simple/chat',
        health: 'https://pam-backend.onrender.com/api/v1/pam/health'
      },
      fallback: {
        chat: 'https://pam-backend.onrender.com/api/v1/pam-simple/chat',
        health: 'https://pam-backend.onrender.com/api/v1/pam/health'
      }
    },
    staging: {
      primary: {
        chat: 'https://wheels-wins-backend-staging.onrender.com/api/v1/pam-simple/chat',
        health: 'https://wheels-wins-backend-staging.onrender.com/api/v1/pam/health'
      },
      fallback: {
        chat: 'https://wheels-wins-backend-staging.onrender.com/api/v1/pam-simple/chat',
        health: 'https://wheels-wins-backend-staging.onrender.com/api/v1/pam/health'
      }
    }
  },

  // Connection settings
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000,
  HEALTH_CHECK_INTERVAL: 60000,

  // Ping/Pong keepalive settings (optimized for reliability)
  PING_INTERVAL: 20000,     // Send ping every 20 seconds
  PONG_TIMEOUT: 10000,      // Wait 10 seconds for pong response
  CONNECTION_TIMEOUT: 15000,

  // WebSocket message timeout (30s - allow time for cold starts and processing)
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
  private currentToken: string | null = null; // Store token for reconnections
  private sessionId: string | null = null; // PAM 2.0 session tracking
  private messageQueue: MessageQueue; // Message queue with IndexedDB persistence
  private queueInitialized: boolean = false;
  private tokenRefreshTimeout?: NodeJS.Timeout; // Token refresh scheduler
  private tokenExpiresAt: number | null = null; // Track token expiration
  private pingInterval?: NodeJS.Timeout; // Ping interval timer
  private pongTimeout?: NodeJS.Timeout; // Pong timeout timer
  private lastPongTime: number = 0; // Track last successful pong
  private missedPongs: number = 0; // Count missed pongs

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

    // Initialize message queue
    this.messageQueue = new MessageQueue();
    this.initializeMessageQueue();

    this.startHealthChecking();
  }

  /**
   * Initialize message queue and set up send callback
   */
  private async initializeMessageQueue(): Promise<void> {
    try {
      await this.messageQueue.initialize();

      // Set callback for sending queued messages
      this.messageQueue.setSendCallback(async (queuedMsg: QueuedMessage) => {
        await this.sendMessageDirectly({
          message: queuedMsg.message,
          user_id: queuedMsg.userId,
          context: queuedMsg.context
        });
      });

      // Start auto-processing every 5 seconds
      this.messageQueue.startAutoProcessing(5000);

      this.queueInitialized = true;
      logger.info('✅ Message queue initialized and auto-processing started');
    } catch (error) {
      logger.error('Failed to initialize message queue:', error);
    }
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
    logger.info('🚀 Using PAM WebSocket endpoints');
    return PAM_CONFIG.WEBSOCKET_ENDPOINTS[env] || PAM_CONFIG.WEBSOCKET_ENDPOINTS.staging;
  }

  // =====================================================
  // CONNECTION MANAGEMENT
  // =====================================================

  async connect(userId: string, token?: string, tokenExpiresAt?: number): Promise<boolean> {
    if (this.status.isConnecting) {
      logger.debug('Already connecting to PAM WebSocket...');
      return false;
    }

    if (!userId) {
      logger.warn('❌ Cannot connect PAM WebSocket without userId');
      return false;
    }

    // Store token for reconnections
    this.currentToken = token || null;
    this.tokenExpiresAt = tokenExpiresAt || null;

    // Schedule proactive token refresh
    if (tokenExpiresAt) {
      this.scheduleTokenRefresh(tokenExpiresAt);
    }

    this.updateStatus({ isConnecting: true, lastError: undefined });

    try {
      await this.connectWebSocket(userId, token);
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

  /**
   * Schedule proactive token refresh (5 minutes before expiry)
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    // Clear existing timeout
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }

    // Calculate when to refresh (5 minutes before expiry)
    const now = Date.now();
    const expiryMs = expiresAt * 1000; // Convert to milliseconds
    const refreshAt = expiryMs - (5 * 60 * 1000); // 5 minutes before
    const delay = Math.max(0, refreshAt - now);

    if (delay === 0) {
      logger.warn('⚠️ Token already expired or expires in less than 5 minutes');
      return;
    }

    logger.info(`🔐 Token refresh scheduled in ${Math.round(delay / 1000 / 60)} minutes (at ${new Date(refreshAt).toLocaleTimeString()})`);

    this.tokenRefreshTimeout = setTimeout(async () => {
      logger.info('🔄 Proactively refreshing token (5min before expiry)');

      try {
        // Import supabase client dynamically to avoid circular dependencies
        const { supabase } = await import('@/integrations/supabase/client');

        // Refresh session
        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
          logger.error('❌ Token refresh failed:', error);
          // Disconnect - user will need to re-authenticate
          this.disconnect();
          return;
        }

        if (data.session) {
          logger.info('✅ Token refreshed successfully');

          // Update stored token
          this.currentToken = data.session.access_token;
          this.tokenExpiresAt = data.session.expires_at || null;

          // Reconnect with new token
          if (this.currentUserId) {
            logger.info('🔄 Reconnecting with refreshed token');
            await this.disconnect();
            await this.connect(
              this.currentUserId,
              data.session.access_token,
              data.session.expires_at
            );
          }

          // Schedule next refresh
          if (data.session.expires_at) {
            this.scheduleTokenRefresh(data.session.expires_at);
          }
        }
      } catch (error) {
        logger.error('❌ Token refresh error:', error);
        this.disconnect();
      }
    }, delay);
  }

  private scheduleRetry(): void {
    const delay = PAM_CONFIG.RECONNECT_DELAY * Math.pow(2, this.status.retryCount);
    logger.info(`🔄 Retrying PAM 2.0 WebSocket connection in ${delay}ms (attempt ${this.status.retryCount + 1}/${PAM_CONFIG.RECONNECT_ATTEMPTS})`);

    this.retryTimeout = setTimeout(async () => {
      this.updateStatus({ retryCount: this.status.retryCount + 1 });

      // Reconnect WebSocket if we have stored credentials
      if (this.currentUserId) {
        try {
          await this.connectWebSocket(this.currentUserId, this.currentToken || undefined);
        } catch (error) {
          console.error('❌ WebSocket retry failed:', error);
        }
      }
    }, delay);
  }

  disconnect(): void {
    // Clear all timers
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = undefined;
    }

    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = undefined;
    }

    // Stop ping/pong
    this.stopPingPong();

    if (this.websocket) {
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }

    this.currentUserId = null;
    this.currentToken = null;
    this.tokenExpiresAt = null;

    this.updateStatus({
      isConnected: false,
      isConnecting: false,
      retryCount: 0
    });

    logger.info('🔌 Disconnected from PAM 2.0 WebSocket backend');
  }

  /**
   * Start ping/pong keepalive mechanism
   */
  private startPingPong(): void {
    this.stopPingPong(); // Clear any existing timers

    this.lastPongTime = Date.now();
    this.missedPongs = 0;

    // Send ping every PING_INTERVAL
    this.pingInterval = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        logger.debug('🏓 Sending ping');

        // Send ping message
        this.websocket.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));

        // Set timeout for pong response
        this.pongTimeout = setTimeout(() => {
          const timeSinceLastPong = Date.now() - this.lastPongTime;

          // Only disconnect if we haven't received pong in a while AND missed multiple pongs
          if (timeSinceLastPong > PAM_CONFIG.PONG_TIMEOUT * 3) {
            this.missedPongs++;
            logger.warn(`⚠️ Pong timeout (${this.missedPongs} missed, last pong ${Math.round(timeSinceLastPong/1000)}s ago)`);

            if (this.missedPongs >= 3) {
              logger.error('❌ Connection appears dead (3 missed pongs) - reconnecting');
              this.scheduleRetry();
            }
          } else {
            // Just slow, not dead - reset missed pongs
            logger.debug(`🐌 Slow pong (${Math.round(timeSinceLastPong/1000)}s latency)`);
            this.missedPongs = 0;
          }
        }, PAM_CONFIG.PONG_TIMEOUT);
      }
    }, PAM_CONFIG.PING_INTERVAL);

    logger.info(`✅ Ping/pong keepalive started (ping: ${PAM_CONFIG.PING_INTERVAL/1000}s, timeout: ${PAM_CONFIG.PONG_TIMEOUT/1000}s)`);
  }

  /**
   * Stop ping/pong keepalive mechanism
   */
  private stopPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }

    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = undefined;
    }

    this.missedPongs = 0;
    logger.debug('⏹️ Ping/pong keepalive stopped');
  }

  /**
   * Handle pong response
   */
  private handlePongResponse(): void {
    this.lastPongTime = Date.now();
    this.missedPongs = 0;

    // Clear pong timeout
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = undefined;
    }

    logger.debug('🏓 Pong received');
  }

  // =====================================================
  // WEBSOCKET CONNECTION METHODS
  // =====================================================

  private async connectWebSocket(userId: string, token?: string): Promise<void> {
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

        // Build WebSocket URL for PAM: /api/v1/pam/ws/{user_id}?token={jwt}
        let wsUrl = `${endpoint}/${userId}`;
        if (token) {
          wsUrl += `?token=${token}`;
        }
        logger.info(`🚀 Connecting to PAM WebSocket: ${wsUrl.replace(/token=[^&]+/, 'token=***')}`);

        console.log(`🌐 Connecting to PAM 2.0 WebSocket (auth: ${token ? 'yes' : 'no'})`);

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

          // Start ping/pong keepalive
          this.startPingPong();

          // Process any queued messages now that connection is restored
          if (this.queueInitialized) {
            logger.info('🔄 Connection restored - processing queued messages');
            this.messageQueue.processQueue().catch(error => {
              logger.error('Error processing queue on reconnection:', error);
            });
          }

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

            // Handle ping requests from backend
            if (data.type === 'ping') {
              if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({
                  type: 'pong',
                  timestamp: data.timestamp
                }));
                logger.debug('🏓 Received ping from backend, sent pong response');
              }
              return;
            }

            // Handle pong responses
            if (data.type === 'pong') {
              this.handlePongResponse();
              return; // Don't log pong messages (too noisy)
            }

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

  /**
   * Public API: Send message (uses queue for reliability)
   */
  async sendMessage(message: PamApiMessage): Promise<PamApiResponse> {
    this.metrics.requestCount++;

    // If WebSocket is connected, try sending directly
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      try {
        return await this.sendMessageDirectly(message);
      } catch (error) {
        logger.warn('⚠️ Direct send failed, queueing message:', error);
        // Fall through to queuing
      }
    }

    // WebSocket not connected or direct send failed - queue the message
    if (this.queueInitialized) {
      logger.info('📝 WebSocket not ready - queueing message for later delivery');

      await this.messageQueue.enqueue(
        message.message,
        message.user_id,
        message.context,
        0 // Normal priority
      );

      // Return placeholder response
      return {
        response: "Your message has been queued and will be sent when connection is restored.",
        message: "Message queued - PAM will respond shortly",
        metadata: { queued: true, status: 'pending' }
      };
    }

    // Queue not ready - try REST as last resort
    logger.warn('⚠️ Message queue not ready, falling back to REST');
    const startTime = Date.now();
    return await this.sendMessageViaRest(message, startTime);
  }

  /**
   * Internal: Send message directly via WebSocket or REST (no queueing)
   */
  private async sendMessageDirectly(message: PamApiMessage): Promise<PamApiResponse> {
    const startTime = Date.now();

    // Detect potential cold start (Render free tier spins down after inactivity)
    const coldStartThreshold = 3000; // 3 seconds
    let coldStartWarningShown = false;

    // Show cold start warning if response takes >3s
    const coldStartTimer = setTimeout(() => {
      if (!coldStartWarningShown) {
        coldStartWarningShown = true;
        console.warn('⏰ PAM is taking longer than usual - backend may be waking up from idle (Render cold start)');
        // Emit event for UI to show "Waking up PAM..." message
        this.updateStatus({
          lastError: 'cold_start_detected',
          healthScore: this.status.healthScore
        });
      }
    }, coldStartThreshold);

    try {
      // Try WebSocket first, then fallback to REST
      const response = await this.sendMessageViaWebSocket(message, startTime);
      clearTimeout(coldStartTimer);

      // Log cold start if it occurred
      const latency = Date.now() - startTime;
      if (latency > coldStartThreshold) {
        console.warn(`🐌 Cold start detected: ${latency}ms (${(latency/1000).toFixed(1)}s)`);
      }

      return response;
    } catch (error) {
      clearTimeout(coldStartTimer);
      logger.warn('⚠️ WebSocket failed, trying REST API fallback:', error);
      return await this.sendMessageViaRest(message, startTime);
    }
  }

  private async sendMessageViaWebSocket(message: PamApiMessage, startTime: number): Promise<PamApiResponse> {
    logger.info('🚀 Routing message to PAM 2.0 via WebSocket');

    // Ensure WebSocket connection is established
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected - please ensure connect() was called first');
    }

    // Enhance message with location context
    const enhancedMessage = await this.enhanceMessageWithLocation(message);

    // Create PAM 2.0 request
    const pam2Request: Pam2ChatRequest = {
      type: 'chat', // Required by backend SecureWebSocketMessage schema
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

          // Handle ping messages (keep-alive)
          if (response.type === 'ping') {
            console.log(`🏓 Received ping, sending pong response`);
            this.websocket?.send(JSON.stringify({ type: 'pong', timestamp: response.timestamp }));
            return; // Don't resolve, just respond to ping
          }

          // Handle error responses from backend
          if (response.error || response.type === 'error') {
            clearTimeout(timeout);
            this.websocket?.removeEventListener('message', messageHandler);

            const latency = Date.now() - startTime;
            this.metrics.errorCount++;

            // Extract error message from various possible fields
            const errorMessage = response.message || response.content || response.response || "I'm currently unable to process your request.";

            const errorResponse: PamApiResponse = {
              response: errorMessage,
              message: errorMessage,
              content: errorMessage,
              error: true,
              metadata: response.metadata
            };

            console.log(`⚠️ PAM 2.0 WebSocket error response (${latency}ms):`, response);
            resolve(errorResponse); // Resolve with error, don't reject (so UI can display it)
            return;
          }

          // Handle success responses - check multiple possible content fields
          const content = response.response || response.message || response.content;
          if (content) {
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
              healthScore: Math.min(100, this.status.healthScore + 5),
              backend: this.getEnvironment()
            });

            // Convert PAM 2.0 response to compatible format
            const legacyResponse: PamApiResponse = {
              response: content,
              message: content,
              content: content,
              ui_action: response.ui_action,
              metadata: response.metadata
            };

            console.log(`✅ PAM 2.0 WebSocket response (${latency}ms):`, response);
            resolve(legacyResponse);
          }
          // If no recognizable response format, ignore (might be status message, etc.)
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
  }

  private async sendMessageViaRest(message: PamApiMessage, startTime: number): Promise<PamApiResponse> {
    const env = this.getEnvironment();
    const endpoints = PAM_CONFIG.REST_ENDPOINTS[env];

    // Enhance message with location context
    const enhancedMessage = await this.enhanceMessageWithLocation(message);

    const pam2Request: Pam2ChatRequest = {
      type: 'chat', // Required by backend SecureWebSocketMessage schema
      user_id: enhancedMessage.user_id,
      message: enhancedMessage.message,
      context: enhancedMessage.context,
      session_id: this.sessionId || undefined
    };

    // Try primary endpoint first (PAM 2.0)
    try {
      logger.info(`🚀 Trying PAM 2.0 REST API: ${endpoints.primary.chat}`);

      // Get JWT token for authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.currentToken) {
        headers['Authorization'] = `Bearer ${this.currentToken}`;
      }

      const response = await fetch(endpoints.primary.chat, {
        method: 'POST',
        headers,
        body: JSON.stringify(pam2Request)
      });

      if (response.ok) {
        const pam2Response: Pam2ChatResponse = await response.json();

        // Store session_id for future requests
        if (pam2Response.session_id) {
          this.sessionId = pam2Response.session_id;
        }

        const latency = Date.now() - startTime;
        this.metrics.successCount++;
        this.metrics.averageLatency = (
          (this.metrics.averageLatency * (this.metrics.successCount - 1) + latency) /
          this.metrics.successCount
        );

        this.updateStatus({
          backend: this.getEnvironment(),
          healthScore: Math.min(100, this.status.healthScore + 5)
        });

        // Convert PAM 2.0 response to compatible format
        const legacyResponse: PamApiResponse = {
          response: pam2Response.response,
          message: pam2Response.response,
          content: pam2Response.response,
          ui_action: pam2Response.ui_action,
          metadata: pam2Response.metadata
        };

        console.log(`✅ PAM 2.0 REST response (${latency}ms):`, pam2Response);
        return legacyResponse;
      } else {
        logger.warn(`⚠️ PAM 2.0 REST failed: ${response.status}, trying fallback`);
      }
    } catch (error) {
      logger.warn('⚠️ PAM 2.0 REST error, trying fallback:', error);
    }

    // Fallback to PAM 1.0
    try {
      logger.info(`🚀 Trying PAM 1.0 fallback REST API: ${endpoints.fallback.chat}`);

      // Get JWT token for authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.currentToken) {
        headers['Authorization'] = `Bearer ${this.currentToken}`;
      }

      const response = await fetch(endpoints.fallback.chat, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: enhancedMessage.user_id,
          message: enhancedMessage.message,
          context: enhancedMessage.context
        })
      });

      if (response.ok) {
        const pam1Response = await response.json();

        const latency = Date.now() - startTime;
        this.metrics.successCount++;
        this.metrics.averageLatency = (
          (this.metrics.averageLatency * (this.metrics.successCount - 1) + latency) /
          this.metrics.successCount
        );

        this.updateStatus({
          backend: 'fallback',
          healthScore: Math.min(100, this.status.healthScore + 3)
        });

        // Convert PAM 1.0 response to compatible format
        const legacyResponse: PamApiResponse = {
          response: pam1Response.response || pam1Response.message,
          message: pam1Response.response || pam1Response.message,
          content: pam1Response.response || pam1Response.message,
          ui_action: pam1Response.ui_action,
          metadata: { ...pam1Response.metadata, fallback: true, version: '1.0' }
        };

        console.log(`✅ PAM 1.0 fallback REST response (${latency}ms):`, pam1Response);
        return legacyResponse;
      } else {
        logger.error(`❌ PAM 1.0 fallback REST failed: ${response.status}`);
        throw new Error(`Both PAM 2.0 and PAM 1.0 REST endpoints failed`);
      }
    } catch (error) {
      this.metrics.failureCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ All PAM endpoints failed:', error);

      this.updateStatus({
        backend: 'offline',
        lastError: errorMessage,
        healthScore: Math.max(0, this.status.healthScore - 15)
      });

      throw new Error(`PAM service unavailable: ${errorMessage}`);
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
   * Get PAM 2.0 health status with fallback to PAM 1.0
   */
  async getHealthStatus(): Promise<Pam2HealthResponse | null> {
    const env = this.getEnvironment();
    const endpoints = PAM_CONFIG.REST_ENDPOINTS[env];

    // Try primary endpoint first (PAM 2.0)
    try {
      logger.info(`🩺 Checking PAM 2.0 health: ${endpoints.primary.health}`);
      const response = await fetch(endpoints.primary.health);
      if (response.ok) {
        const healthData = await response.json() as Pam2HealthResponse;
        logger.info('✅ PAM 2.0 health check successful');
        return healthData;
      } else {
        logger.warn(`⚠️ PAM 2.0 health check failed: ${response.status}, trying fallback`);
      }
    } catch (error) {
      logger.warn('⚠️ PAM 2.0 health check error, trying fallback:', error);
    }

    // Fallback to PAM 1.0
    try {
      logger.info(`🩺 Checking PAM 1.0 fallback health: ${endpoints.fallback.health}`);
      const response = await fetch(endpoints.fallback.health);
      if (response.ok) {
        const healthData = await response.json();
        logger.info('✅ PAM 1.0 fallback health check successful');
        // Convert PAM 1.0 response to PAM 2.0 format
        return {
          status: 'healthy',
          service: 'pam-1.0-fallback',
          version: '1.0.0',
          modules: healthData.modules || {},
          features: healthData.features || {},
          timestamp: new Date().toISOString()
        };
      } else {
        logger.error(`❌ PAM 1.0 fallback health check failed: ${response.status}`);
      }
    } catch (error) {
      logger.error('❌ PAM 1.0 fallback health check error:', error);
    }

    return null;
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
  async destroy(): Promise<void> {
    this.disconnect();
    this.stopHealthChecking();
    this.listeners.clear();

    // Cleanup message queue
    if (this.messageQueue) {
      await this.messageQueue.destroy();
    }
  }

  /**
   * Get message queue stats (for debugging)
   */
  async getQueueStats() {
    if (this.queueInitialized) {
      return await this.messageQueue.getStats();
    }
    return null;
  }
}

// =====================================================
// EXPORTS
// =====================================================

export const pamService = PamService.getInstance();
export default pamService;