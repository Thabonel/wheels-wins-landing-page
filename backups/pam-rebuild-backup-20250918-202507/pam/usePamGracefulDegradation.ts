/**
 * PAM Graceful Degradation Hook - Day 3 Fallback Implementation
 * Seamlessly switches between online and offline modes with smart fallbacks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PAMOfflineQueue, QueuedMessage } from '@/services/pam/PAMOfflineQueue';

export interface DegradationState {
  mode: 'online' | 'degraded' | 'offline' | 'error';
  isAvailable: boolean;
  canSendMessages: boolean;
  canReceiveMessages: boolean;
  queuedMessageCount: number;
  lastSuccessfulConnection: number | null;
  degradationReason: string | null;
}

export interface DegradationFeatures {
  offlineMessaging: boolean;
  localStorage: boolean;
  smartRetry: boolean;
  fallbackUI: boolean;
  analyticsTracking: boolean;
}

export interface ConnectionHealth {
  latency: number;
  successRate: number;
  errorCount: number;
  lastError: string | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
}

const DEFAULT_FEATURES: DegradationFeatures = {
  offlineMessaging: true,
  localStorage: true,
  smartRetry: true,
  fallbackUI: true,
  analyticsTracking: true
};

export function usePamGracefulDegradation(
  isConnected: boolean,
  connectionError: string | null,
  features: Partial<DegradationFeatures> = {}
) {
  const config = { ...DEFAULT_FEATURES, ...features };

  const [degradationState, setDegradationState] = useState<DegradationState>({
    mode: 'offline',
    isAvailable: false,
    canSendMessages: false,
    canReceiveMessages: false,
    queuedMessageCount: 0,
    lastSuccessfulConnection: null,
    degradationReason: null
  });

  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    latency: 0,
    successRate: 100,
    errorCount: 0,
    lastError: null,
    connectionQuality: 'excellent'
  });

  const offlineQueueRef = useRef<PAMOfflineQueue | null>(null);
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null);
  const lastHealthCheckRef = useRef<number>(0);
  const responseTimesRef = useRef<number[]>([]);
  const errorHistoryRef = useRef<{ time: number; error: string }[]>([]);

  // Initialize offline queue
  useEffect(() => {
    if (config.offlineMessaging && !offlineQueueRef.current) {
      offlineQueueRef.current = new PAMOfflineQueue({
        maxQueueSize: 50,
        maxRetries: 3,
        enablePersistence: config.localStorage,
        enablePriority: true
      });

      // Set up queue event listeners
      offlineQueueRef.current.on('messageQueued', updateQueueCount);
      offlineQueueRef.current.on('messageDequeued', updateQueueCount);
      offlineQueueRef.current.on('messageSent', updateQueueCount);
      offlineQueueRef.current.on('messageFailed', updateQueueCount);
    }

    return () => {
      if (offlineQueueRef.current) {
        offlineQueueRef.current.destroy();
        offlineQueueRef.current = null;
      }
    };
  }, [config.offlineMessaging, config.localStorage]);

  // Update degradation state based on connection status
  useEffect(() => {
    updateDegradationState();
  }, [isConnected, connectionError]);

  // Start health monitoring when connected
  useEffect(() => {
    if (isConnected && config.analyticsTracking) {
      startHealthMonitoring();
    } else {
      stopHealthMonitoring();
    }

    return () => stopHealthMonitoring();
  }, [isConnected, config.analyticsTracking]);

  // Update queue count
  const updateQueueCount = useCallback(() => {
    if (offlineQueueRef.current) {
      const stats = offlineQueueRef.current.getStats();
      setDegradationState(prev => ({
        ...prev,
        queuedMessageCount: stats.pendingMessages
      }));
    }
  }, []);

  // Update degradation state based on current conditions
  const updateDegradationState = useCallback(() => {
    let mode: DegradationState['mode'] = 'offline';
    let isAvailable = false;
    let canSendMessages = false;
    let canReceiveMessages = false;
    let degradationReason: string | null = null;

    if (isConnected) {
      const quality = connectionHealth.connectionQuality;

      if (quality === 'excellent' || quality === 'good') {
        mode = 'online';
        isAvailable = true;
        canSendMessages = true;
        canReceiveMessages = true;
      } else if (quality === 'poor') {
        mode = 'degraded';
        isAvailable = true;
        canSendMessages = true; // With queuing
        canReceiveMessages = false; // Limited
        degradationReason = 'Poor connection quality';
      } else {
        mode = 'error';
        isAvailable = false;
        canSendMessages = config.offlineMessaging; // Queue only
        canReceiveMessages = false;
        degradationReason = 'Connection unstable';
      }
    } else {
      if (connectionError) {
        if (connectionError.includes('DNS') || connectionError.includes('name_not_resolved')) {
          mode = 'error';
          degradationReason = 'DNS resolution failed';
        } else if (connectionError.includes('timeout')) {
          mode = 'error';
          degradationReason = 'Connection timeout';
        } else {
          mode = 'error';
          degradationReason = connectionError;
        }
      } else {
        mode = 'offline';
        degradationReason = 'No connection';
      }

      isAvailable = false;
      canSendMessages = config.offlineMessaging;
      canReceiveMessages = false;
    }

    setDegradationState(prev => ({
      ...prev,
      mode,
      isAvailable,
      canSendMessages,
      canReceiveMessages,
      degradationReason,
      lastSuccessfulConnection: isConnected ? Date.now() : prev.lastSuccessfulConnection
    }));
  }, [isConnected, connectionError, connectionHealth.connectionQuality, config.offlineMessaging]);

  // Send message with degradation handling
  const sendMessage = useCallback(async (
    content: string,
    userId: string,
    options: {
      priority?: 'high' | 'normal' | 'low';
      type?: 'chat' | 'command' | 'voice';
      metadata?: Record<string, any>;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; queued?: boolean; error?: string }> => {
    if (!degradationState.canSendMessages) {
      return {
        success: false,
        error: 'Messaging is not available in current mode'
      };
    }

    // If online and healthy, try direct send
    if (degradationState.mode === 'online') {
      try {
        const startTime = Date.now();

        // Simulate sending (replace with actual WebSocket send)
        await simulateDirectSend(content, userId, options);

        const responseTime = Date.now() - startTime;
        recordResponseTime(responseTime);

        return { success: true };
      } catch (error) {
        recordError(error instanceof Error ? error.message : 'Unknown error');

        // Fall back to queuing if direct send fails
        if (config.offlineMessaging && offlineQueueRef.current) {
          const messageId = offlineQueueRef.current.enqueue(content, userId, options);
          return { success: true, messageId, queued: true };
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // For degraded/offline modes, use queue
    if (config.offlineMessaging && offlineQueueRef.current) {
      const messageId = offlineQueueRef.current.enqueue(content, userId, {
        ...options,
        priority: degradationState.mode === 'degraded' ? 'high' : options.priority
      });

      return { success: true, messageId, queued: true };
    }

    return {
      success: false,
      error: 'Offline messaging is disabled'
    };
  }, [degradationState, config.offlineMessaging]);

  // Get user-friendly status message
  const getStatusMessage = useCallback((): string => {
    switch (degradationState.mode) {
      case 'online':
        return 'PAM is online and fully available';

      case 'degraded':
        return 'PAM is running in limited mode due to connection issues';

      case 'offline':
        return config.offlineMessaging
          ? 'PAM is offline. Messages will be queued and sent when connection is restored.'
          : 'PAM is offline and unavailable';

      case 'error':
        return `PAM encountered an error: ${degradationState.degradationReason}`;

      default:
        return 'PAM status unknown';
    }
  }, [degradationState.mode, degradationState.degradationReason, config.offlineMessaging]);

  // Get available actions for current mode
  const getAvailableActions = useCallback(() => {
    const actions = [];

    if (degradationState.canSendMessages) {
      actions.push('send_message');
    }

    if (degradationState.mode === 'offline' && config.offlineMessaging) {
      actions.push('queue_message');
    }

    if (degradationState.mode === 'error' || degradationState.mode === 'offline') {
      actions.push('retry_connection');
    }

    if (config.fallbackUI) {
      actions.push('view_alternatives');
    }

    return actions;
  }, [degradationState, config]);

  // Get fallback suggestions
  const getFallbackSuggestions = useCallback(() => {
    const suggestions = [];

    switch (degradationState.mode) {
      case 'offline':
        suggestions.push(
          'Use the demo mode to test PAM features',
          'Browse other app features while waiting',
          'Messages will be sent automatically when back online'
        );
        break;

      case 'error':
        if (degradationState.degradationReason?.includes('DNS')) {
          suggestions.push(
            'Try the mock development mode',
            'Check your network settings',
            'Contact your network administrator'
          );
        } else {
          suggestions.push(
            'Refresh the page to retry',
            'Check your internet connection',
            'Try again in a few minutes'
          );
        }
        break;

      case 'degraded':
        suggestions.push(
          'Connection is slow - messages may take longer',
          'Consider using priority messaging',
          'Some features may be limited'
        );
        break;
    }

    return suggestions;
  }, [degradationState.mode, degradationState.degradationReason]);

  // Health monitoring functions
  const startHealthMonitoring = useCallback(() => {
    healthCheckRef.current = setInterval(() => {
      performHealthCheck();
    }, 10000); // Check every 10 seconds
  }, []);

  const stopHealthMonitoring = useCallback(() => {
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current);
      healthCheckRef.current = null;
    }
  }, []);

  const performHealthCheck = useCallback(async () => {
    if (!isConnected) return;

    try {
      const startTime = Date.now();
      await simulateHealthCheck();
      const latency = Date.now() - startTime;

      recordResponseTime(latency);
      updateConnectionHealth();
    } catch (error) {
      recordError(error instanceof Error ? error.message : 'Health check failed');
      updateConnectionHealth();
    }
  }, [isConnected]);

  const recordResponseTime = useCallback((time: number) => {
    responseTimesRef.current.push(time);
    if (responseTimesRef.current.length > 20) {
      responseTimesRef.current = responseTimesRef.current.slice(-20);
    }
  }, []);

  const recordError = useCallback((error: string) => {
    errorHistoryRef.current.push({ time: Date.now(), error });
    if (errorHistoryRef.current.length > 10) {
      errorHistoryRef.current = errorHistoryRef.current.slice(-10);
    }
  }, []);

  const updateConnectionHealth = useCallback(() => {
    const responseTimes = responseTimesRef.current;
    const errors = errorHistoryRef.current;
    const recentErrors = errors.filter(e => Date.now() - e.time < 60000); // Last minute

    const avgLatency = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const totalRequests = responseTimes.length + recentErrors.length;
    const successRate = totalRequests > 0
      ? (responseTimes.length / totalRequests) * 100
      : 100;

    let quality: ConnectionHealth['connectionQuality'] = 'excellent';

    if (successRate < 50 || avgLatency > 2000) {
      quality = 'critical';
    } else if (successRate < 80 || avgLatency > 1000) {
      quality = 'poor';
    } else if (successRate < 95 || avgLatency > 500) {
      quality = 'good';
    }

    setConnectionHealth({
      latency: Math.round(avgLatency),
      successRate: Math.round(successRate),
      errorCount: recentErrors.length,
      lastError: recentErrors.length > 0 ? recentErrors[recentErrors.length - 1].error : null,
      connectionQuality: quality
    });
  }, []);

  // Simulation functions (replace with actual implementations)
  const simulateDirectSend = async (content: string, userId: string, options: any): Promise<void> => {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() < 0.9) resolve(undefined);
        else reject(new Error('Network error'));
      }, Math.random() * 500 + 100);
    });
  };

  const simulateHealthCheck = async (): Promise<void> => {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() < 0.95) resolve(undefined);
        else reject(new Error('Health check failed'));
      }, Math.random() * 200 + 50);
    });
  };

  return {
    degradationState,
    connectionHealth,
    sendMessage,
    getStatusMessage,
    getAvailableActions,
    getFallbackSuggestions,
    offlineQueue: offlineQueueRef.current
  };
}

export default usePamGracefulDegradation;