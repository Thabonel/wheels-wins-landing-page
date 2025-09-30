/**
 * PAM Hybrid WebSocket Hook
 *
 * WebSocket integration for hybrid PAM system:
 * - GPT-4o-mini for simple queries (95%)
 * - Claude Agent SDK for complex tasks (5%)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { pamHybridService, HybridWebSocketMessage, HybridResponse } from '@/services/pamHybridService';
import { logger } from '@/lib/logger';

export interface PamHybridMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  handler?: string;
  complexity?: string;
  agent_used?: string | null;
  tools_called?: string[];
  cost_usd?: number;
  latency_ms?: number;
}

export interface UsePamHybridWebSocketReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // Messages
  messages: PamHybridMessage[];
  isTyping: boolean;

  // Actions
  sendMessage: (message: string, context?: Record<string, any>) => void;
  clearMessages: () => void;
  reconnect: () => void;

  // Metrics
  totalCost: number;
  averageLatency: number;
}

export function usePamHybridWebSocket(): UsePamHybridWebSocketReturn {
  const { user, session } = useAuth();

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<PamHybridMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [averageLatency, setAverageLatency] = useState(0);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const latencyDataRef = useRef<number[]>([]);

  // Constants
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;
  const PING_INTERVAL = 30000; // 30 seconds

  /**
   * Clear all timers
   */
  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!user?.id || !session?.access_token) {
      logger.warn('Cannot connect: Missing user or token');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      logger.info('WebSocket already connected');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ws = pamHybridService.createWebSocket(user.id, session.access_token);

      ws.onopen = () => {
        logger.info('🔗 Hybrid WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const data: HybridWebSocketMessage = JSON.parse(event.data);

          if (data.type === 'pong') {
            // Keepalive response
            return;
          }

          if (data.type === 'response') {
            // Assistant response
            const message: PamHybridMessage = {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              content: data.content || '',
              timestamp: new Date(),
              handler: data.handler,
              complexity: data.complexity,
              agent_used: data.agent_used,
              tools_called: data.tools_called,
              cost_usd: data.cost_usd,
              latency_ms: data.latency_ms
            };

            setMessages(prev => [...prev, message]);
            setIsTyping(false);

            // Update metrics
            if (data.cost_usd) {
              setTotalCost(prev => prev + data.cost_usd!);
            }

            if (data.latency_ms) {
              latencyDataRef.current.push(data.latency_ms);
              const avg = latencyDataRef.current.reduce((a, b) => a + b, 0) / latencyDataRef.current.length;
              setAverageLatency(Math.round(avg));
            }

            logger.info('Hybrid response received', {
              handler: data.handler,
              complexity: data.complexity,
              latency: data.latency_ms,
              cost: data.cost_usd
            });
          }

          if (data.type === 'error') {
            logger.error('Hybrid WebSocket error message', { message: data.message });
            setError(data.message || 'An error occurred');
            setIsTyping(false);
          }

        } catch (parseError) {
          logger.error('Failed to parse WebSocket message', { parseError });
        }
      };

      ws.onerror = (event) => {
        logger.error('Hybrid WebSocket error', { event });
        setError('Connection error occurred');
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        logger.info('🔌 Hybrid WebSocket disconnected', {
          code: event.code,
          reason: event.reason
        });

        setIsConnected(false);
        setIsConnecting(false);
        clearTimers();

        // Auto-reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          logger.info(`Attempting reconnect ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Connection lost. Please refresh the page.');
        }
      };

      wsRef.current = ws;

    } catch (err) {
      logger.error('Failed to create WebSocket', { err });
      setError('Failed to establish connection');
      setIsConnecting(false);
    }
  }, [user, session, clearTimers]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    clearTimers();

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, [clearTimers]);

  /**
   * Send a message
   */
  const sendMessage = useCallback((message: string, context?: Record<string, any>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      logger.error('Cannot send message: WebSocket not connected');
      setError('Not connected. Reconnecting...');
      connect();
      return;
    }

    if (!message.trim()) {
      return;
    }

    // Add user message to UI
    const userMessage: PamHybridMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setError(null);

    // Send via WebSocket
    const wsMessage: HybridWebSocketMessage = {
      type: 'message',
      content: message,
      context: context || {},
      voice_input: false
    };

    wsRef.current.send(JSON.stringify(wsMessage));

    logger.info('Message sent via hybrid WebSocket', { message: message.substring(0, 50) });
  }, [connect]);

  /**
   * Clear messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setTotalCost(0);
    setAverageLatency(0);
    latencyDataRef.current = [];
  }, []);

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(() => connect(), 500);
  }, [disconnect, connect]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    error,

    // Messages
    messages,
    isTyping,

    // Actions
    sendMessage,
    clearMessages,
    reconnect,

    // Metrics
    totalCost,
    averageLatency
  };
}