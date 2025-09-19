/**
 * PAM WebSocket Performance Monitor and Optimizer
 * Day 2 Hour 3-4: Performance optimization and monitoring
 */

import { useState, useEffect, useRef, useCallback } from 'react';

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

  // Performance Metrics
  memoryUsage: number;
  cpuUsage: number;
  bandwidthUsed: number;

  // Error Metrics
  errorCount: number;
  timeoutCount: number;
  lastErrorTime: number | null;

  // Health Score (0-100)
  healthScore: number;
}

export interface ConnectionQuality {
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  score: number;
  issues: string[];
  recommendations: string[];
}

export interface PerformanceOptimization {
  enableMessageBatching: boolean;
  batchSize: number;
  batchDelay: number;
  enableCompression: boolean;
  adaptiveHeartbeat: boolean;
  connectionPooling: boolean;
}

const DEFAULT_OPTIMIZATION: PerformanceOptimization = {
  enableMessageBatching: true,
  batchSize: 5,
  batchDelay: 100, // ms
  enableCompression: false, // Browser WebSocket doesn't support compression control
  adaptiveHeartbeat: true,
  connectionPooling: false // Single connection per user
};

export function usePamWebSocketPerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    connectionLatency: 0,
    averageResponseTime: 0,
    connectionUptime: 0,
    reconnectionCount: 0,
    messagesSent: 0,
    messagesReceived: 0,
    messageSuccessRate: 100,
    duplicateMessagesBlocked: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    bandwidthUsed: 0,
    errorCount: 0,
    timeoutCount: 0,
    lastErrorTime: null,
    healthScore: 100
  });

  const [optimization, setOptimization] = useState<PerformanceOptimization>(DEFAULT_OPTIMIZATION);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    quality: 'excellent',
    score: 100,
    issues: [],
    recommendations: []
  });

  // Performance tracking refs
  const startTimeRef = useRef<number>(Date.now());
  const connectionStartRef = useRef<number>(0);
  const responseTimesRef = useRef<number[]>([]);
  const errorHistoryRef = useRef<{ time: number; error: string }[]>([]);
  const bandwidthRef = useRef<{ sent: number; received: number }>({ sent: 0, received: 0 });
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Message batching for performance
  const messageBatchRef = useRef<any[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memory usage tracking
  const trackMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round((memory.usedJSHeapSize / 1024 / 1024) * 100) / 100; // MB
    }
    return 0;
  }, []);

  // Calculate connection quality
  const calculateConnectionQuality = useCallback((currentMetrics: PerformanceMetrics): ConnectionQuality => {
    let score = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check response time
    if (currentMetrics.averageResponseTime > 1000) {
      score -= 20;
      issues.push('High response time');
      recommendations.push('Check network connection');
    } else if (currentMetrics.averageResponseTime > 500) {
      score -= 10;
      issues.push('Moderate response time');
    }

    // Check success rate
    if (currentMetrics.messageSuccessRate < 95) {
      score -= 30;
      issues.push('Low message success rate');
      recommendations.push('Check connection stability');
    } else if (currentMetrics.messageSuccessRate < 98) {
      score -= 15;
      issues.push('Moderate message loss');
    }

    // Check reconnection frequency
    if (currentMetrics.reconnectionCount > 5) {
      score -= 25;
      issues.push('Frequent reconnections');
      recommendations.push('Investigate network stability');
    } else if (currentMetrics.reconnectionCount > 2) {
      score -= 10;
      issues.push('Some reconnections occurred');
    }

    // Check error rate
    if (currentMetrics.errorCount > 10) {
      score -= 20;
      issues.push('High error rate');
      recommendations.push('Check system logs for details');
    }

    // Check memory usage
    if (currentMetrics.memoryUsage > 50) {
      score -= 15;
      issues.push('High memory usage');
      recommendations.push('Consider refreshing the page');
    }

    // Determine quality level
    let quality: ConnectionQuality['quality'];
    if (score >= 90) quality = 'excellent';
    else if (score >= 75) quality = 'good';
    else if (score >= 60) quality = 'fair';
    else if (score >= 40) quality = 'poor';
    else quality = 'critical';

    // Add general recommendations
    if (score < 80) {
      recommendations.push('Consider using mock mode for development');
    }

    return {
      quality,
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }, []);

  // Update performance metrics
  const updateMetrics = useCallback(() => {
    const now = Date.now();
    const uptime = Math.floor((now - connectionStartRef.current) / 1000);
    const memoryUsage = trackMemoryUsage();

    // Calculate average response time
    const responseTimes = responseTimesRef.current;
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Calculate success rate
    const successRate = metrics.messagesSent > 0
      ? (metrics.messagesReceived / metrics.messagesSent) * 100
      : 100;

    // Calculate health score based on multiple factors
    const healthScore = Math.min(100, Math.max(0,
      100 -
      (metrics.errorCount * 5) -
      (metrics.timeoutCount * 3) -
      (metrics.reconnectionCount * 2) -
      (averageResponseTime > 500 ? 10 : 0) -
      (memoryUsage > 30 ? 5 : 0)
    ));

    const updatedMetrics: PerformanceMetrics = {
      ...metrics,
      connectionUptime: uptime,
      averageResponseTime: Math.round(averageResponseTime),
      messageSuccessRate: Math.round(successRate * 100) / 100,
      memoryUsage,
      healthScore: Math.round(healthScore)
    };

    setMetrics(updatedMetrics);
    setConnectionQuality(calculateConnectionQuality(updatedMetrics));
  }, [metrics, trackMemoryUsage, calculateConnectionQuality]);

  // Start performance monitoring
  const startMonitoring = useCallback(() => {
    connectionStartRef.current = Date.now();

    // Update metrics every 5 seconds
    metricsIntervalRef.current = setInterval(updateMetrics, 5000);
  }, [updateMetrics]);

  // Stop performance monitoring
  const stopMonitoring = useCallback(() => {
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }
  }, []);

  // Track connection event
  const trackConnection = useCallback((latency: number) => {
    setMetrics(prev => ({
      ...prev,
      connectionLatency: latency
    }));
  }, []);

  // Track message sent
  const trackMessageSent = useCallback((size: number = 0) => {
    bandwidthRef.current.sent += size;
    setMetrics(prev => ({
      ...prev,
      messagesSent: prev.messagesSent + 1,
      bandwidthUsed: bandwidthRef.current.sent + bandwidthRef.current.received
    }));
  }, []);

  // Track message received
  const trackMessageReceived = useCallback((responseTime: number, size: number = 0) => {
    bandwidthRef.current.received += size;
    responseTimesRef.current.push(responseTime);

    // Keep only last 100 response times
    if (responseTimesRef.current.length > 100) {
      responseTimesRef.current = responseTimesRef.current.slice(-100);
    }

    setMetrics(prev => ({
      ...prev,
      messagesReceived: prev.messagesReceived + 1,
      bandwidthUsed: bandwidthRef.current.sent + bandwidthRef.current.received
    }));
  }, []);

  // Track error
  const trackError = useCallback((error: string) => {
    const now = Date.now();
    errorHistoryRef.current.push({ time: now, error });

    // Keep only last 50 errors
    if (errorHistoryRef.current.length > 50) {
      errorHistoryRef.current = errorHistoryRef.current.slice(-50);
    }

    setMetrics(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1,
      lastErrorTime: now
    }));
  }, []);

  // Track timeout
  const trackTimeout = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      timeoutCount: prev.timeoutCount + 1
    }));
  }, []);

  // Track reconnection
  const trackReconnection = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      reconnectionCount: prev.reconnectionCount + 1
    }));
  }, []);

  // Track duplicate message blocked
  const trackDuplicateBlocked = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      duplicateMessagesBlocked: prev.duplicateMessagesBlocked + 1
    }));
  }, []);

  // Get optimization recommendations
  const getOptimizationRecommendations = useCallback(() => {
    const recommendations: string[] = [];

    if (metrics.averageResponseTime > 500) {
      recommendations.push('Enable message batching to reduce network overhead');
    }

    if (metrics.memoryUsage > 30) {
      recommendations.push('Consider implementing message history cleanup');
    }

    if (metrics.reconnectionCount > 3) {
      recommendations.push('Enable adaptive heartbeat to improve connection stability');
    }

    if (metrics.messageSuccessRate < 95) {
      recommendations.push('Implement message retry mechanism');
    }

    return recommendations;
  }, [metrics]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setMetrics({
      connectionLatency: 0,
      averageResponseTime: 0,
      connectionUptime: 0,
      reconnectionCount: 0,
      messagesSent: 0,
      messagesReceived: 0,
      messageSuccessRate: 100,
      duplicateMessagesBlocked: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      bandwidthUsed: 0,
      errorCount: 0,
      timeoutCount: 0,
      lastErrorTime: null,
      healthScore: 100
    });

    responseTimesRef.current = [];
    errorHistoryRef.current = [];
    bandwidthRef.current = { sent: 0, received: 0 };
    startTimeRef.current = Date.now();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [stopMonitoring]);

  return {
    metrics,
    connectionQuality,
    optimization,

    // Monitoring controls
    startMonitoring,
    stopMonitoring,
    resetMetrics,

    // Event tracking
    trackConnection,
    trackMessageSent,
    trackMessageReceived,
    trackError,
    trackTimeout,
    trackReconnection,
    trackDuplicateBlocked,

    // Optimization
    setOptimization,
    getOptimizationRecommendations
  };
}

export default usePamWebSocketPerformance;