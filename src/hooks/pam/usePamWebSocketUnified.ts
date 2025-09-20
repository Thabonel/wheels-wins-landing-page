/**
 * PAM WebSocket Unified Hook - DEV/TEST ONLY
 *
 * 🧪 WARNING: This is for DEVELOPMENT AND TESTING ONLY
 *
 * 🚨 PRODUCTION CODE MUST USE: src/services/pamService.ts
 *
 * ❌ DO NOT use this hook in production components
 * ❌ DO NOT import this in src/components/ (except /dev/)
 * ❌ DO NOT extend this for production features
 *
 * ✅ ONLY for /dev/ testing pages
 * ✅ ONLY for WebSocket stress testing
 * ✅ ONLY for connection quality analysis
 *
 * See ADR-PAM-WEBSOCKET-ARCHITECTURE.md for architecture guidelines
 *
 * Combines the best features from all previous implementations:
 * - Core: Fixed URL construction, JWT refresh, message deduplication, heartbeat
 * - Optimized: Smart batching, compression, connection quality
 * - Performance: Health scoring, comprehensive metrics, monitoring
 *
 * Features:
 * ✅ Fixed URL construction: /api/v1/pam/ws/${userId}?token=${token}
 * ✅ Exponential backoff with configurable delays
 * ✅ Proactive JWT token refresh before expiration
 * ✅ Connection state management (5 states)
 * ✅ Message deduplication with configurable window
 * ✅ Smart message batching with priority levels
 * ✅ Message compression for reduced bandwidth
 * ✅ Health score calculation (0-100)
 * ✅ Performance metrics and monitoring
 * ✅ Connection quality assessment
 * ✅ Environment-aware endpoint selection
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getWebSocketUrl } from '@/services/api';
import { getValidAccessToken, WebSocketAuthManager, type TokenValidationResult } from '@/utils/websocketAuth';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export type MessagePriority = 'high' | 'normal' | 'low';

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface PamMessage {
  id: string;
  type: 'chat_response' | 'message' | 'ping' | 'pong' | 'connection' | 'visual_action' | 'ui_actions' | 'error';
  message?: string;
  content?: string;
  timestamp: number;
  priority?: MessagePriority;
  metadata?: Record<string, any>;
  status?: string;
  action?: string;
  actions?: Array<any>;
  error?: string;
}

export interface PerformanceMetrics {
  // Connection Metrics
  connectionLatency: number;
  averageResponseTime: number;
  connectionUptime: number;
  reconnectionCount: number;

  // Message Metrics
  messagesSent: number;
  messagesReceived: number;
  messageSuccessRate: number;
  duplicateMessagesBlocked: number;
  messagesPerSecond: number;

  // Performance Metrics
  compressionRatio: number;
  bytesTransferred: number;
  bandwidthUsed: number;

  // Error Metrics
  errorCount: number;
  timeoutCount: number;
  lastErrorTime: number | null;

  // Health Score (0-100)
  healthScore: number;
}

export interface ConnectionQualityReport {
  quality: ConnectionQuality;
  score: number;
  issues: string[];
  recommendations: string[];
}

export interface WebSocketUnifiedOptions {
  // Core options
  onMessage?: (message: PamMessage) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onQualityChange?: (quality: ConnectionQualityReport) => void;
  autoReconnect?: boolean;
  reconnectDelays?: number[];

  // Performance options
  heartbeatInterval?: number;
  deduplicationWindow?: number;
  tokenRefreshThreshold?: number;

  // Optimization options
  enableBatching?: boolean;
  batchSize?: number;
  batchDelay?: number;
  enableCompression?: boolean;
  enableMetrics?: boolean;
}

// =====================================================
// INTERNAL INTERFACES
// =====================================================

interface MessageDeduplicationEntry {
  messageHash: string;
  timestamp: number;
  messageId: string;
}

interface MessageBatch {
  messages: PamMessage[];
  timestamp: number;
  priority: MessagePriority;
}

// =====================================================
// DEFAULT CONFIGURATION
// =====================================================

const DEFAULT_OPTIONS: Required<WebSocketUnifiedOptions> = {
  onMessage: () => {},
  onStatusChange: () => {},
  onQualityChange: () => {},
  autoReconnect: true,
  reconnectDelays: [1000, 2000, 4000, 8000, 16000], // Exponential backoff
  heartbeatInterval: 20000, // 20 seconds
  deduplicationWindow: 5000, // 5 seconds
  tokenRefreshThreshold: 300000, // 5 minutes before expiry
  enableBatching: true,
  batchSize: 5,
  batchDelay: 100, // 100ms
  enableCompression: true,
  enableMetrics: true,
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const hashMessage = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
};

const compressMessage = (message: PamMessage): string => {
  // Simple compression: remove unnecessary whitespace and shorten common keys
  const compressed = JSON.stringify(message)
    .replace(/\s+/g, ' ')
    .replace(/"timestamp":/g, '"t":')
    .replace(/"content":/g, '"c":')
    .replace(/"message":/g, '"m":')
    .replace(/"metadata":/g, '"md":')
    .replace(/"priority":/g, '"p":');

  return compressed;
};

const decompressMessage = (data: string): PamMessage => {
  // Reverse compression
  const normalized = data
    .replace(/"t":/g, '"timestamp":')
    .replace(/"c":/g, '"content":')
    .replace(/"m":/g, '"message":')
    .replace(/"md":/g, '"metadata":')
    .replace(/"p":/g, '"priority":');

  return JSON.parse(normalized);
};

const calculateHealthScore = (metrics: PerformanceMetrics): number => {
  let score = 100;

  // Connection reliability (40% of score)
  const connectionReliability = Math.max(0, 100 - (metrics.reconnectionCount * 10));
  score = score * 0.4 + connectionReliability * 0.4;

  // Message success rate (30% of score)
  score = score * 0.7 + metrics.messageSuccessRate * 0.3;

  // Response time (20% of score)
  const responseTimeScore = Math.max(0, 100 - Math.min(metrics.averageResponseTime / 50, 100));
  score = score * 0.8 + responseTimeScore * 0.2;

  // Error rate (10% of score)
  const errorScore = Math.max(0, 100 - (metrics.errorCount * 5));
  score = score * 0.9 + errorScore * 0.1;

  return Math.round(Math.max(0, Math.min(100, score)));
};

const getConnectionQuality = (healthScore: number): ConnectionQuality => {
  if (healthScore >= 90) return 'excellent';
  if (healthScore >= 75) return 'good';
  if (healthScore >= 60) return 'fair';
  if (healthScore >= 40) return 'poor';
  return 'critical';
};

// =====================================================
// MAIN HOOK
// =====================================================

export const usePamWebSocketUnified = (
  userId: string | null,
  token: string | null,
  options: WebSocketUnifiedOptions = {}
) => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<PamMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    connectionLatency: 0,
    averageResponseTime: 0,
    connectionUptime: 0,
    reconnectionCount: 0,
    messagesSent: 0,
    messagesReceived: 0,
    messageSuccessRate: 100,
    duplicateMessagesBlocked: 0,
    messagesPerSecond: 0,
    compressionRatio: 0,
    bytesTransferred: 0,
    bandwidthUsed: 0,
    errorCount: 0,
    timeoutCount: 0,
    lastErrorTime: null,
    healthScore: 100,
  });

  // =====================================================
  // REFS FOR PERSISTENT DATA
  // =====================================================

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authManagerRef = useRef<WebSocketAuthManager | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const messageDeduplicationRef = useRef<MessageDeduplicationEntry[]>([]);
  const messageBatchRef = useRef<PamMessage[]>([]);
  const connectionStartTimeRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());

  // =====================================================
  // ENVIRONMENT-AWARE URL CONSTRUCTION
  // =====================================================

  const getWebSocketEndpoint = useCallback(() => {
    if (!userId || !token) return null;

    // Environment-aware endpoint selection (prevents staging→production contamination)
    const isProduction = window.location.hostname === 'wheelsandwins.com';
    const baseUrl = isProduction
      ? 'wss://pam-backend.onrender.com'
      : 'wss://wheels-wins-backend-staging.onrender.com';

    return `${baseUrl}/api/v1/pam/ws/${userId}?token=${token}`;
  }, [userId, token]);

  // =====================================================
  // MESSAGE DEDUPLICATION
  // =====================================================

  const isDuplicateMessage = useCallback((message: PamMessage): boolean => {
    const messageHash = hashMessage(message.content || message.message || '');
    const now = Date.now();

    // Clean old entries
    messageDeduplicationRef.current = messageDeduplicationRef.current.filter(
      entry => now - entry.timestamp < config.deduplicationWindow
    );

    // Check for duplicate
    const isDuplicate = messageDeduplicationRef.current.some(
      entry => entry.messageHash === messageHash && entry.messageId !== message.id
    );

    if (isDuplicate) {
      setMetrics(prev => ({ ...prev, duplicateMessagesBlocked: prev.duplicateMessagesBlocked + 1 }));
      return true;
    }

    // Add to deduplication list
    messageDeduplicationRef.current.push({
      messageHash,
      timestamp: now,
      messageId: message.id,
    });

    return false;
  }, [config.deduplicationWindow]);

  // =====================================================
  // CONNECTION QUALITY MONITORING
  // =====================================================

  const calculateConnectionQuality = useCallback((): ConnectionQualityReport => {
    const healthScore = calculateHealthScore(metrics);
    const quality = getConnectionQuality(healthScore);
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (metrics.reconnectionCount > 3) {
      issues.push('Frequent reconnections detected');
      recommendations.push('Check network stability');
    }

    if (metrics.averageResponseTime > 2000) {
      issues.push('High response times');
      recommendations.push('Consider reducing message frequency');
    }

    if (metrics.messageSuccessRate < 90) {
      issues.push('Low message success rate');
      recommendations.push('Check backend service health');
    }

    if (metrics.errorCount > 5) {
      issues.push('High error rate');
      recommendations.push('Review error logs and check authentication');
    }

    return {
      quality,
      score: healthScore,
      issues,
      recommendations,
    };
  }, [metrics]);

  // =====================================================
  // MESSAGE BATCHING
  // =====================================================

  const flushMessageBatch = useCallback(() => {
    if (messageBatchRef.current.length === 0 || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const batch = [...messageBatchRef.current];
    messageBatchRef.current = [];

    try {
      const batchMessage = {
        type: 'batch',
        messages: batch,
        timestamp: Date.now(),
      };

      const serialized = config.enableCompression
        ? compressMessage(batchMessage as PamMessage)
        : JSON.stringify(batchMessage);

      wsRef.current.send(serialized);

      // Update metrics
      setMetrics(prev => ({
        ...prev,
        messagesSent: prev.messagesSent + batch.length,
        bytesTransferred: prev.bytesTransferred + serialized.length,
        compressionRatio: config.enableCompression
          ? (JSON.stringify(batchMessage).length / serialized.length)
          : 1,
      }));

    } catch (error) {
      console.error('Failed to send message batch:', error);
      setMetrics(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
    }
  }, [config.enableCompression]);

  // =====================================================
  // HEARTBEAT MECHANISM
  // =====================================================

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const pingMessage: PamMessage = {
          id: generateMessageId(),
          type: 'ping',
          timestamp: Date.now(),
        };

        try {
          wsRef.current.send(JSON.stringify(pingMessage));
          lastActivityRef.current = Date.now();
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      }
    }, config.heartbeatInterval);
  }, [config.heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // =====================================================
  // CONNECTION MANAGEMENT
  // =====================================================

  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    config.onStatusChange(status);

    // Update uptime metrics
    if (status === 'connected' && connectionStartTimeRef.current === 0) {
      connectionStartTimeRef.current = Date.now();
    } else if (status === 'disconnected' && connectionStartTimeRef.current > 0) {
      const uptime = Date.now() - connectionStartTimeRef.current;
      setMetrics(prev => ({ ...prev, connectionUptime: prev.connectionUptime + uptime }));
      connectionStartTimeRef.current = 0;
    }
  }, [config]);

  const connect = useCallback(async () => {
    if (!userId || !token) {
      setError('User ID and token are required for WebSocket connection');
      return;
    }

    const wsUrl = getWebSocketEndpoint();
    if (!wsUrl) {
      setError('Failed to construct WebSocket URL');
      return;
    }

    try {
      updateConnectionStatus('connecting');
      setError(null);

      // Initialize auth manager if needed
      if (!authManagerRef.current) {
        authManagerRef.current = new WebSocketAuthManager(token, config.tokenRefreshThreshold);
      }

      // Check and refresh token if needed
      const tokenCheck: TokenValidationResult = await authManagerRef.current.validateAndRefreshToken();
      if (!tokenCheck.isValid) {
        throw new Error('Invalid or expired token');
      }

      const connectStartTime = Date.now();
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        const connectionLatency = Date.now() - connectStartTime;
        console.log(`🔗 PAM WebSocket connected (${connectionLatency}ms)`);

        updateConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        startHeartbeat();

        // Update connection metrics
        setMetrics(prev => ({
          ...prev,
          connectionLatency,
          reconnectionCount: prev.reconnectionCount > 0 ? prev.reconnectionCount : 0,
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const responseStartTime = Date.now();

          let message: PamMessage;
          if (config.enableCompression) {
            message = decompressMessage(event.data);
          } else {
            message = JSON.parse(event.data);
          }

          // Handle ping/pong
          if (message.type === 'ping') {
            const pongMessage: PamMessage = {
              id: generateMessageId(),
              type: 'pong',
              timestamp: Date.now(),
            };
            wsRef.current?.send(JSON.stringify(pongMessage));
            return;
          }

          if (message.type === 'pong') {
            const latency = Date.now() - (message.timestamp || responseStartTime);
            setMetrics(prev => ({
              ...prev,
              averageResponseTime: (prev.averageResponseTime + latency) / 2,
            }));
            return;
          }

          // Check for duplicates
          if (isDuplicateMessage(message)) {
            return;
          }

          // Update message metrics
          const responseTime = responseStartTime - (message.timestamp || responseStartTime);
          setMetrics(prev => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1,
            averageResponseTime: (prev.averageResponseTime + responseTime) / 2,
          }));

          // Add to messages and notify
          setMessages(prev => [...prev, message]);
          config.onMessage(message);

        } catch (error) {
          console.error('Failed to process WebSocket message:', error);
          setMetrics(prev => ({
            ...prev,
            errorCount: prev.errorCount + 1,
            lastErrorTime: Date.now(),
          }));
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('PAM WebSocket error:', error);
        setError('WebSocket connection error');
        setMetrics(prev => ({
          ...prev,
          errorCount: prev.errorCount + 1,
          lastErrorTime: Date.now(),
        }));
      };

      wsRef.current.onclose = (event) => {
        console.log('PAM WebSocket closed:', event.code, event.reason);
        stopHeartbeat();
        updateConnectionStatus('disconnected');

        // Auto-reconnect if enabled
        if (config.autoReconnect && event.code !== 1000) {
          const delay = config.reconnectDelays[Math.min(reconnectAttemptsRef.current, config.reconnectDelays.length - 1)];
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);

          updateConnectionStatus('reconnecting');
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            setMetrics(prev => ({ ...prev, reconnectionCount: prev.reconnectionCount + 1 }));
            connect();
          }, delay);
        }
      };

    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      setError(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      updateConnectionStatus('error');

      setMetrics(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        lastErrorTime: Date.now(),
      }));
    }
  }, [userId, token, getWebSocketEndpoint, config, updateConnectionStatus, startHeartbeat, stopHeartbeat, isDuplicateMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    updateConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, [stopHeartbeat, updateConnectionStatus]);

  // =====================================================
  // MESSAGE SENDING
  // =====================================================

  const sendMessage = useCallback((
    messageData: string | Partial<PamMessage>,
    priority: MessagePriority = 'normal'
  ) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return { success: false, error: 'Not connected' };
    }

    try {
      const message: PamMessage = {
        id: generateMessageId(),
        timestamp: Date.now(),
        type: 'message',
        priority,
        ...(typeof messageData === 'string'
          ? { message: messageData }
          : messageData
        ),
      };

      // High priority messages bypass batching
      if (priority === 'high' || !config.enableBatching) {
        const serialized = config.enableCompression
          ? compressMessage(message)
          : JSON.stringify(message);

        wsRef.current.send(serialized);

        // Update metrics immediately
        setMetrics(prev => ({
          ...prev,
          messagesSent: prev.messagesSent + 1,
          bytesTransferred: prev.bytesTransferred + serialized.length,
        }));

        return { success: true };
      }

      // Add to batch queue for normal/low priority messages
      messageBatchRef.current.push(message);

      // Schedule batch flush if not already scheduled
      if (!batchTimeoutRef.current) {
        batchTimeoutRef.current = setTimeout(() => {
          flushMessageBatch();
          batchTimeoutRef.current = null;
        }, config.batchDelay);
      }

      // Flush immediately if batch is full
      if (messageBatchRef.current.length >= config.batchSize) {
        if (batchTimeoutRef.current) {
          clearTimeout(batchTimeoutRef.current);
          batchTimeoutRef.current = null;
        }
        flushMessageBatch();
      }

      return { success: true };

    } catch (error) {
      console.error('Failed to send message:', error);
      setMetrics(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        messageSuccessRate: Math.max(0, prev.messageSuccessRate - 1),
      }));
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
  }, [config.enableBatching, config.enableCompression, config.batchDelay, config.batchSize, flushMessageBatch]);

  // =====================================================
  // METRICS & QUALITY MONITORING
  // =====================================================

  const connectionQuality = useMemo(() => {
    return calculateConnectionQuality();
  }, [calculateConnectionQuality]);

  // Update health score and notify of quality changes
  useEffect(() => {
    const healthScore = calculateHealthScore(metrics);
    setMetrics(prev => ({ ...prev, healthScore }));

    const quality = calculateConnectionQuality();
    config.onQualityChange(quality);
  }, [metrics.reconnectionCount, metrics.messageSuccessRate, metrics.averageResponseTime, metrics.errorCount, calculateConnectionQuality, config]);

  // Calculate messages per second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeDiff = now - lastActivityRef.current;
      if (timeDiff > 0) {
        const messagesPerSecond = (metrics.messagesSent + metrics.messagesReceived) / (timeDiff / 1000);
        setMetrics(prev => ({ ...prev, messagesPerSecond }));
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [metrics.messagesSent, metrics.messagesReceived]);

  // =====================================================
  // LIFECYCLE MANAGEMENT
  // =====================================================

  // Auto-connect when userId and token become available
  useEffect(() => {
    if (userId && token && connectionStatus === 'disconnected') {
      connect();
    }
  }, [userId, token, connectionStatus, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // =====================================================
  // PUBLIC API
  // =====================================================

  return {
    // Connection state
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    error,

    // Messages
    messages,
    sendMessage,

    // Connection control
    connect,
    disconnect,

    // Performance & Quality
    metrics,
    connectionQuality,
    healthScore: metrics.healthScore,

    // Utilities
    clearMessages: () => setMessages([]),
    resetMetrics: () => setMetrics({
      connectionLatency: 0,
      averageResponseTime: 0,
      connectionUptime: 0,
      reconnectionCount: 0,
      messagesSent: 0,
      messagesReceived: 0,
      messageSuccessRate: 100,
      duplicateMessagesBlocked: 0,
      messagesPerSecond: 0,
      compressionRatio: 0,
      bytesTransferred: 0,
      bandwidthUsed: 0,
      errorCount: 0,
      timeoutCount: 0,
      lastErrorTime: null,
      healthScore: 100,
    }),
  };
};

export default usePamWebSocketUnified;