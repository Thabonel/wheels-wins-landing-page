/**
 * Unified PAM WebSocket Hook
 * Consolidates all WebSocket functionality with proper deduplication and state management
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getWebSocketUrl } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { jwtDecode } from 'jwt-decode';

// Message types
interface WebSocketMessage {
  id?: string;
  type: string;
  message?: string;
  content?: string;
  timestamp?: number;
  metadata?: any;
}

interface MessageDeduplicationEntry {
  messageHash: string;
  timestamp: number;
  messageId: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

interface UsePamWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  deduplicationWindow?: number;
}

// Utility functions
const generateMessageId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const hashMessage = (message: any): string => {
  const content = typeof message === 'string' ? message : JSON.stringify(message);
  return `${content}-${Date.now()}`;
};

export const usePamWebSocketUnified = (
  userId: string,
  token: string,
  options: UsePamWebSocketOptions = {}
) => {
  const {
    onMessage,
    onStatusChange,
    autoReconnect = true,
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 20000,
    deduplicationWindow = 5000
  } = options;

  // State management
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs for WebSocket and timers
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isClosingRef = useRef(false);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  
  // Deduplication tracking
  const deduplicationMapRef = useRef<Map<string, MessageDeduplicationEntry>>(new Map());
  const lastSentMessageRef = useRef<string>('');
  const lastSentTimeRef = useRef<number>(0);

  // Connection status update with callback
  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    onStatusChange?.(status);
    
    if (status === 'connected') {
      setError(null);
      reconnectAttemptsRef.current = 0;
    }
  }, [onStatusChange]);

  // Clean up old deduplication entries
  const cleanupDeduplicationMap = useCallback(() => {
    const now = Date.now();
    const entries = Array.from(deduplicationMapRef.current.entries());
    
    for (const [hash, entry] of entries) {
      if (now - entry.timestamp > deduplicationWindow) {
        deduplicationMapRef.current.delete(hash);
      }
    }
  }, [deduplicationWindow]);

  // Check if message is duplicate
  const isDuplicateMessage = useCallback((message: WebSocketMessage): boolean => {
    cleanupDeduplicationMap();
    
    // Generate hash for the message
    const messageContent = message.message || message.content || '';
    const messageHash = hashMessage(messageContent);
    
    // Check if we've seen this exact message recently
    if (deduplicationMapRef.current.has(messageHash)) {
      const entry = deduplicationMapRef.current.get(messageHash)!;
      const timeDiff = Date.now() - entry.timestamp;
      
      if (timeDiff < deduplicationWindow) {
        console.log('🔄 Duplicate message detected, skipping:', messageContent.substring(0, 50));
        return true;
      }
    }
    
    // Check if this is the same as the last sent message within the window
    if (messageContent === lastSentMessageRef.current) {
      const timeDiff = Date.now() - lastSentTimeRef.current;
      if (timeDiff < deduplicationWindow) {
        console.log('🔄 Same as last sent message, skipping:', messageContent.substring(0, 50));
        return true;
      }
    }
    
    // Not a duplicate, store it
    deduplicationMapRef.current.set(messageHash, {
      messageHash,
      timestamp: Date.now(),
      messageId: message.id || generateMessageId()
    });
    
    return false;
  }, [deduplicationWindow, cleanupDeduplicationMap]);

  // Process incoming message
  const processIncomingMessage = useCallback((data: any) => {
    try {
      const message: WebSocketMessage = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Add timestamp and ID if not present
      if (!message.timestamp) {
        message.timestamp = Date.now();
      }
      if (!message.id) {
        message.id = generateMessageId();
      }
      
      // Check for duplicates
      if (isDuplicateMessage(message)) {
        return;
      }
      
      // Handle different message types
      if (message.type === 'pong') {
        // Heartbeat response, don't process as regular message
        console.log('💓 Heartbeat pong received');
        return;
      }
      
      if (message.type === 'error') {
        setError(message.message || 'Unknown error');
        console.error('❌ WebSocket error:', message);
      }
      
      // Add to messages and trigger callback
      setMessages(prev => [...prev, message]);
      onMessage?.(message);
      
      console.log('✅ Message processed:', message.type, message.id);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }, [isDuplicateMessage, onMessage]);

  // Send heartbeat
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      console.log('💗 Heartbeat ping sent');
    }
  }, []);

  // Setup heartbeat interval
  const setupHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, heartbeatInterval);
    // Send initial heartbeat
    sendHeartbeat();
  }, [sendHeartbeat, heartbeatInterval]);

  // Clear heartbeat interval
  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Process message queue
  const processMessageQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      const queue = [...messageQueueRef.current];
      messageQueueRef.current = [];
      
      queue.forEach(message => {
        try {
          wsRef.current?.send(JSON.stringify(message));
          console.log('📤 Queued message sent:', message);
        } catch (error) {
          console.error('Error sending queued message:', error);
          messageQueueRef.current.push(message);
        }
      });
    }
  }, []);

  // Send message with deduplication and queueing
  const sendMessage = useCallback((message: any) => {
    if (!message) {
      console.warn('Attempted to send empty message');
      return false;
    }

    // Normalize message format
    const messageToSend: WebSocketMessage = {
      id: generateMessageId(),
      timestamp: Date.now(),
      ...(typeof message === 'string' ? { message, type: 'message' } : message)
    };

    // Store for deduplication
    const messageContent = messageToSend.message || messageToSend.content || '';
    lastSentMessageRef.current = messageContent;
    lastSentTimeRef.current = Date.now();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(messageToSend));
        console.log('📤 Message sent:', messageToSend);
        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        messageQueueRef.current.push(messageToSend);
        return false;
      }
    } else {
      console.log('📋 Message queued (connection not ready):', messageToSend);
      messageQueueRef.current.push(messageToSend);
      
      if (connectionStatus === 'disconnected' && autoReconnect) {
        connect();
      }
      return false;
    }
  }, [connectionStatus, autoReconnect]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('🔌 Already connected or connecting');
      return;
    }

    if (!userId || !token) {
      console.error('Missing userId or token for WebSocket connection');
      setError('Authentication required');
      return;
    }

    try {
      updateConnectionStatus('connecting');
      isClosingRef.current = false;

      const wsUrl = `${getWebSocketUrl(`/api/v1/pam/ws/${userId}`)}?token=${encodeURIComponent(token)}`;
      console.log('🔌 Connecting to PAM WebSocket...');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ PAM WebSocket connected');
        updateConnectionStatus('connected');
        setupHeartbeat();
        processMessageQueue();
      };

      ws.onmessage = (event) => {
        processIncomingMessage(event.data);
      };

      ws.onerror = (event) => {
        console.error('❌ PAM WebSocket error:', event);
        setError('Connection error');
        updateConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log('🔌 PAM WebSocket closed:', event.code, event.reason);
        clearHeartbeat();
        wsRef.current = null;

        if (!isClosingRef.current) {
          updateConnectionStatus('disconnected');

          if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(
              reconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
              30000
            );
            
            reconnectAttemptsRef.current++;
            updateConnectionStatus('reconnecting');
            
            console.log(`⏳ Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            setError('Maximum reconnection attempts reached');
            console.error('❌ Max reconnection attempts reached');
          }
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setError('Failed to connect');
      updateConnectionStatus('error');
    }
  }, [userId, token, updateConnectionStatus, setupHeartbeat, clearHeartbeat, 
      processMessageQueue, processIncomingMessage, autoReconnect, reconnectDelay, 
      maxReconnectAttempts]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    isClosingRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    clearHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    updateConnectionStatus('disconnected');
    console.log('🔌 Disconnected from PAM WebSocket');
  }, [clearHeartbeat, updateConnectionStatus]);

  // Reset connection
  const reset = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    messageQueueRef.current = [];
    deduplicationMapRef.current.clear();
    setMessages([]);
    setError(null);
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  // Auto-connect on mount if userId and token are available
  useEffect(() => {
    if (userId && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, token]);

  // Memoized return value
  return useMemo(() => ({
    // Connection state
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error,
    
    // Messages
    messages,
    clearMessages: () => setMessages([]),
    
    // Actions
    sendMessage,
    connect,
    disconnect,
    reset,
    
    // Stats
    reconnectAttempts: reconnectAttemptsRef.current,
    queuedMessages: messageQueueRef.current.length
  }), [connectionStatus, error, messages, sendMessage, connect, disconnect, reset]);
};

export default usePamWebSocketUnified;