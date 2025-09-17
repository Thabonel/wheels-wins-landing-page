/**
 * Optimized PAM WebSocket Hook
 * Performance-focused WebSocket implementation with smart batching and compression
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { pamCache } from '@/utils/cacheManager';
import { performanceMonitor } from '@/utils/performanceMonitor';

interface OptimizedMessage {
  id: string;
  content: string;
  timestamp: number;
  userId: string;
  priority: 'high' | 'normal' | 'low';
  type: 'chat' | 'command' | 'heartbeat';
}

interface ConnectionMetrics {
  messagesPerSecond: number;
  averageLatency: number;
  compressionRatio: number;
  bytesTransferred: number;
  reconnectCount: number;
}

interface WebSocketConfig {
  batchSize: number;
  batchDelay: number;
  enableCompression: boolean;
  enableMetrics: boolean;
  heartbeatInterval: number;
}

export const usePamWebSocketOptimized = (
  userId: string,
  token: string,
  config: Partial<WebSocketConfig> = {}
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('offline');
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    messagesPerSecond: 0,
    averageLatency: 0,
    compressionRatio: 0,
    bytesTransferred: 0,
    reconnectCount: 0
  });

  const wsRef = useRef<WebSocket | null>(null);
  const messageQueueRef = useRef<OptimizedMessage[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const metricsRef = useRef<ConnectionMetrics>(metrics);
  const pendingMessagesRef = useRef<Map<string, { timestamp: number; resolve: Function; reject: Function }>>(new Map());

  const finalConfig: WebSocketConfig = {
    batchSize: 5,
    batchDelay: 100, // 100ms batching
    enableCompression: true,
    enableMetrics: true,
    heartbeatInterval: 30000, // 30 seconds
    ...config
  };

  // Compression utilities
  const compressMessage = useCallback((message: OptimizedMessage): string => {
    if (!finalConfig.enableCompression) {
      return JSON.stringify(message);
    }

    // Simple compression: remove unnecessary whitespace and common patterns
    const compressed = JSON.stringify(message)
      .replace(/\s+/g, ' ')
      .replace(/"timestamp":/g, '"t":')
      .replace(/"content":/g, '"c":')
      .replace(/"userId":/g, '"u":');

    return compressed;
  }, [finalConfig.enableCompression]);

  const decompressMessage = useCallback((data: string): OptimizedMessage => {
    try {
      // Reverse compression
      const normalized = data
        .replace(/"t":/g, '"timestamp":')
        .replace(/"c":/g, '"content":')
        .replace(/"u":/g, '"userId":');

      return JSON.parse(normalized);
    } catch {
      return JSON.parse(data);
    }
  }, []);

  // Metrics tracking
  const updateMetrics = useCallback((update: Partial<ConnectionMetrics>) => {
    metricsRef.current = { ...metricsRef.current, ...update };
    setMetrics(metricsRef.current);

    // Cache metrics for performance analysis
    pamCache.set(userId, 'websocket_metrics', metricsRef.current, 60000); // 1 minute TTL
  }, [userId]);

  const calculateConnectionQuality = useCallback(() => {
    const { averageLatency, messagesPerSecond } = metricsRef.current;

    if (!isConnected) {
      setConnectionQuality('offline');
    } else if (averageLatency < 100 && messagesPerSecond > 1) {
      setConnectionQuality('excellent');
    } else if (averageLatency < 300 && messagesPerSecond > 0.5) {
      setConnectionQuality('good');
    } else {
      setConnectionQuality('poor');
    }
  }, [isConnected]);

  // Smart message batching
  const flushMessageQueue = useCallback(() => {
    if (messageQueueRef.current.length === 0 || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const messages = messageQueueRef.current.splice(0, finalConfig.batchSize);
    const batchData = {
      type: 'batch',
      messages: messages.map(compressMessage),
      timestamp: Date.now(),
      userId
    };

    const serialized = JSON.stringify(batchData);
    const startTime = Date.now();

    try {
      wsRef.current.send(serialized);

      // Track performance
      const latency = Date.now() - startTime;
      const originalSize = JSON.stringify(messages).length;
      const compressedSize = serialized.length;

      updateMetrics({
        bytesTransferred: metricsRef.current.bytesTransferred + compressedSize,
        compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
        averageLatency: (metricsRef.current.averageLatency + latency) / 2
      });

      performanceMonitor.recordUserInteraction('websocket_batch_send', latency);

      // Handle pending message promises
      messages.forEach(msg => {
        const pending = pendingMessagesRef.current.get(msg.id);
        if (pending) {
          pending.resolve({ success: true, latency });
          pendingMessagesRef.current.delete(msg.id);
        }
      });

    } catch (error) {
      console.error('❌ WebSocket batch send failed:', error);

      // Reject pending messages
      messages.forEach(msg => {
        const pending = pendingMessagesRef.current.get(msg.id);
        if (pending) {
          pending.reject(error);
          pendingMessagesRef.current.delete(msg.id);
        }
      });
    }

    // Clear batch timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
  }, [compressMessage, finalConfig.batchSize, userId, updateMetrics]);

  const scheduleFlush = useCallback(() => {
    if (batchTimeoutRef.current) {
      return; // Already scheduled
    }

    batchTimeoutRef.current = setTimeout(() => {
      flushMessageQueue();
      batchTimeoutRef.current = null;
    }, finalConfig.batchDelay);
  }, [flushMessageQueue, finalConfig.batchDelay]);

  // Optimized send message function
  const sendMessage = useCallback(async (
    content: string,
    priority: 'high' | 'normal' | 'low' = 'normal',
    type: 'chat' | 'command' = 'chat'
  ): Promise<{ success: boolean; latency?: number }> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message: OptimizedMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      timestamp: Date.now(),
      userId,
      priority,
      type
    };

    // High priority messages bypass batching
    if (priority === 'high') {
      const compressed = compressMessage(message);
      wsRef.current.send(compressed);
      return { success: true };
    }

    // Add to batch queue
    messageQueueRef.current.push(message);

    // Create promise for message delivery
    return new Promise((resolve, reject) => {
      pendingMessagesRef.current.set(message.id, {
        timestamp: Date.now(),
        resolve,
        reject
      });

      // Schedule flush if queue is full or timeout
      if (messageQueueRef.current.length >= finalConfig.batchSize) {
        flushMessageQueue();
      } else {
        scheduleFlush();
      }
    });
  }, [userId, compressMessage, finalConfig.batchSize, flushMessageQueue, scheduleFlush]);

  // Heartbeat system
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        sendMessage('ping', 'low', 'heartbeat').catch(console.warn);
      }
    }, finalConfig.heartbeatInterval);
  }, [sendMessage, finalConfig.heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Connection management
  const connect = useCallback(() => {
    if (wsRef.current) {
      return; // Already connected or connecting
    }

    const wsUrl = `${process.env.VITE_WEBSOCKET_URL || 'wss://pam-backend.onrender.com'}/api/v1/pam/ws/${userId}?token=${token}`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('🔗 WebSocket connected (optimized)');
        setIsConnected(true);
        startHeartbeat();
        calculateConnectionQuality();

        // Load cached metrics
        const cachedMetrics = pamCache.get<ConnectionMetrics>(userId, 'websocket_metrics');
        if (cachedMetrics) {
          setMetrics(cachedMetrics);
          metricsRef.current = cachedMetrics;
        }

        performanceMonitor.recordUserInteraction('websocket_connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types
          if (data.type === 'batch_response') {
            // Process batch response
            data.responses?.forEach((response: any) => {
              // Handle individual responses
            });
          } else if (data.type === 'pong') {
            // Heartbeat response - update latency
            const latency = Date.now() - data.timestamp;
            updateMetrics({
              averageLatency: (metricsRef.current.averageLatency + latency) / 2
            });
          }

          calculateConnectionQuality();
        } catch (error) {
          console.error('❌ WebSocket message processing error:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket disconnected (optimized)');
        setIsConnected(false);
        setConnectionQuality('offline');
        stopHeartbeat();
        wsRef.current = null;

        updateMetrics({
          reconnectCount: metricsRef.current.reconnectCount + 1
        });
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error (optimized):', error);
        setConnectionQuality('poor');
      };

    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
    }
  }, [userId, token, startHeartbeat, stopHeartbeat, calculateConnectionQuality, updateMetrics]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      stopHeartbeat();
      flushMessageQueue(); // Send any pending messages
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionQuality('offline');
  }, [stopHeartbeat, flushMessageQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionQuality,
    metrics,
    sendMessage,
    connect,
    disconnect,
    flushQueue: flushMessageQueue
  };
};