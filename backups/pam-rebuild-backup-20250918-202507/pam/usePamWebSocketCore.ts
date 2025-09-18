/**
 * PAM WebSocket Core Hook - Unified Implementation
 * Emergency Stabilization: Single source of truth for all PAM WebSocket connections
 * 
 * Features:
 * - Fixed URL construction: /api/v1/pam/ws/${userId}?token=${token}
 * - Exponential backoff: [1000, 2000, 4000, 8000, 16000] ms
 * - Proactive JWT token refresh before expiration
 * - Connection state management (disconnected, connecting, connected, reconnecting, error)
 * - Message deduplication with 5-second window
 * - Proper TypeScript types for all message formats
 * - Heartbeat/ping mechanism every 20 seconds
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getWebSocketUrl } from '@/services/api';
import { getValidAccessToken, WebSocketAuthManager, type TokenValidationResult } from '@/utils/websocketAuth';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface PamMessage {
  id: string;
  type: 'chat_response' | 'message' | 'ping' | 'pong' | 'connection' | 'visual_action' | 'ui_actions' | 'error';
  message?: string;
  content?: string;
  timestamp: number;
  metadata?: Record<string, any>;
  status?: string;
  action?: string;
  actions?: Array<any>;
  error?: string;
}

export interface WebSocketOptions {
  onMessage?: (message: PamMessage) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  autoReconnect?: boolean;
  reconnectDelays?: number[];
  heartbeatInterval?: number;
  deduplicationWindow?: number;
  tokenRefreshThreshold?: number;
}

interface MessageDeduplicationEntry {
  messageHash: string;
  timestamp: number;
  messageId: string;
}

const DEFAULT_OPTIONS: Required<WebSocketOptions> = {
  onMessage: () => {},
  onStatusChange: () => {},
  autoReconnect: true,
  reconnectDelays: [1000, 2000, 4000, 8000, 16000],
  heartbeatInterval: 20000,
  deduplicationWindow: 5000,
  tokenRefreshThreshold: 300000, // 5 minutes in ms
};

const generateMessageId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

const hashMessage = (message: PamMessage): string => {
  const content = message.message || message.content || message.type;
  return `${content}-${message.type}-${Math.floor(message.timestamp / 1000)}`;
};

export const usePamWebSocketCore = (
  userId: string | null,
  token: string | null,
  options: WebSocketOptions = {}
) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<PamMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(token);

  // Refs for WebSocket and management
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const isClosingRef = useRef<boolean>(false);
  const messageQueueRef = useRef<PamMessage[]>([]);
  const authManagerRef = useRef<WebSocketAuthManager | null>(null);
  
  // Deduplication tracking
  const deduplicationMapRef = useRef<Map<string, MessageDeduplicationEntry>>(new Map());
  const lastSentMessageRef = useRef<string>('');
  const lastSentTimeRef = useRef<number>(0);

  // Initialize auth manager
  useEffect(() => {
    authManagerRef.current = new WebSocketAuthManager({
      tokenRefreshThreshold: Math.floor(config.tokenRefreshThreshold / 60000), // Convert ms to minutes
      maxRetries: 3,
      retryDelay: 1000,
    });

    authManagerRef.current.onTokenRefreshCallback((newToken: string) => {
      console.log('🔄 Token refreshed, reconnecting WebSocket');
      setCurrentToken(newToken);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        reconnect();
      }
    });

    authManagerRef.current.startTokenMonitoring();

    return () => {
      authManagerRef.current?.dispose();
    };
  }, [config.tokenRefreshThreshold]);

  // Connection status update with callback
  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    config.onStatusChange(status);
    
    if (status === 'connected') {
      setError(null);
      reconnectAttemptRef.current = 0;
    }
  }, [config]);

  // Clean up old deduplication entries
  const cleanupDeduplicationMap = useCallback(() => {
    const now = Date.now();
    const entries = Array.from(deduplicationMapRef.current.entries());
    
    for (const [hash, entry] of entries) {
      if (now - entry.timestamp > config.deduplicationWindow) {
        deduplicationMapRef.current.delete(hash);
      }
    }
  }, [config.deduplicationWindow]);

  // Check if message is duplicate
  const isDuplicateMessage = useCallback((message: PamMessage): boolean => {
    cleanupDeduplicationMap();
    
    const messageHash = hashMessage(message);
    
    if (deduplicationMapRef.current.has(messageHash)) {
      const entry = deduplicationMapRef.current.get(messageHash)!;
      const timeDiff = Date.now() - entry.timestamp;
      
      if (timeDiff < config.deduplicationWindow) {
        console.log('🔄 Duplicate message detected, skipping:', messageHash.substring(0, 50));
        return true;
      }
    }
    
    // Check if this is the same as the last sent message within the window
    const messageContent = message.message || message.content || '';
    if (messageContent === lastSentMessageRef.current) {
      const timeDiff = Date.now() - lastSentTimeRef.current;
      if (timeDiff < config.deduplicationWindow) {
        console.log('🔄 Same as last sent message, skipping:', messageContent.substring(0, 50));
        return true;
      }
    }
    
    deduplicationMapRef.current.set(messageHash, {
      messageHash,
      timestamp: Date.now(),
      messageId: message.id
    });
    
    return false;
  }, [config.deduplicationWindow, cleanupDeduplicationMap]);

  // Process incoming message
  const processIncomingMessage = useCallback((data: string | ArrayBuffer) => {
    try {
      const rawMessage = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString());
      
      const message: PamMessage = {
        id: rawMessage.id || generateMessageId(),
        timestamp: rawMessage.timestamp || Date.now(),
        type: rawMessage.type || 'message',
        ...rawMessage
      };
      
      // Check for duplicates
      if (isDuplicateMessage(message)) {
        return;
      }
      
      // Handle different message types
      switch (message.type) {
        case 'pong':
          console.log('💓 Heartbeat pong received');
          return;
          
        case 'ping':
          console.log('🏓 Ping received from server, sending pong');
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const pongMessage: PamMessage = {
              id: generateMessageId(),
              type: 'pong',
              timestamp: Date.now()
            };
            wsRef.current.send(JSON.stringify(pongMessage));
          }
          return;
          
        case 'connection':
          console.log('🔌 Connection status:', message.status, message.message);
          return;
          
        case 'visual_action':
          console.log('🎨 Visual action received:', message.action);
          config.onMessage(message);
          return;
          
        case 'ui_actions':
          console.log('🎬 UI actions received:', message.actions);
          config.onMessage(message);
          return;
          
        case 'error':
          setError(message.message || message.error || 'Unknown error');
          console.error('❌ WebSocket error:', message);
          break;
          
        case 'chat_response':
        case 'message':
        default:
          setMessages(prev => [...prev, message]);
          break;
      }
      
      config.onMessage(message);
      console.log('✅ Message processed:', message.type, message.id);
    } catch (error) {
      console.error('❌ Error processing message:', error);
      setError(`Message processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [isDuplicateMessage, config]);

  // Send heartbeat
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const pingMessage: PamMessage = {
        id: generateMessageId(),
        type: 'ping',
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(pingMessage));
      console.log('💗 Heartbeat ping sent');
    }
  }, []);

  // Setup heartbeat interval
  const setupHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, config.heartbeatInterval);
    sendHeartbeat();
  }, [sendHeartbeat, config.heartbeatInterval]);

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
          console.log('📤 Queued message sent:', message.id);
        } catch (error) {
          console.error('❌ Error sending queued message:', error);
          messageQueueRef.current.push(message);
        }
      });
    }
  }, []);

  // Send message with deduplication and queueing
  const sendMessage = useCallback((messageData: Partial<PamMessage> | string): boolean => {
    if (!messageData) {
      console.warn('⚠️ Attempted to send empty message');
      return false;
    }

    const message: PamMessage = {
      id: generateMessageId(),
      timestamp: Date.now(),
      type: 'message',
      ...(typeof messageData === 'string' 
        ? { message: messageData } 
        : messageData
      )
    };

    // Store for deduplication
    const messageContent = message.message || message.content || '';
    lastSentMessageRef.current = messageContent;
    lastSentTimeRef.current = Date.now();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        console.log('📤 Message sent:', message.id);
        return true;
      } catch (error) {
        console.error('❌ Error sending message:', error);
        messageQueueRef.current.push(message);
        return false;
      }
    } else {
      console.log('📋 Message queued (connection not ready):', message.id);
      messageQueueRef.current.push(message);
      
      if (connectionStatus === 'disconnected' && config.autoReconnect) {
        connect();
      }
      return false;
    }
  }, [connectionStatus, config.autoReconnect]);

  // Get valid token with refresh
  const getValidToken = useCallback(async (): Promise<string | null> => {
    try {
      const tokenValidation = await getValidAccessToken();
      if (tokenValidation.isValid && tokenValidation.token) {
        return tokenValidation.token;
      }
      setError(tokenValidation.error || 'Invalid token');
      return null;
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      setError('Token validation failed');
      return null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('🔌 Already connected or connecting');
      return;
    }

    if (!userId) {
      console.error('❌ Missing userId for WebSocket connection');
      setError('User ID required');
      return;
    }

    try {
      updateConnectionStatus('connecting');
      isClosingRef.current = false;

      const validToken = currentToken || await getValidToken();
      if (!validToken) {
        setError('Authentication failed');
        updateConnectionStatus('error');
        return;
      }

      setCurrentToken(validToken);

      // Fixed URL construction: /api/v1/pam/ws/${userId}?token=${token}
      const wsUrl = `${getWebSocketUrl(`/api/v1/pam/ws/${userId}`)}?token=${encodeURIComponent(validToken)}`;
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

          if (config.autoReconnect && reconnectAttemptRef.current < config.reconnectDelays.length) {
            const delay = config.reconnectDelays[reconnectAttemptRef.current];
            
            reconnectAttemptRef.current++;
            updateConnectionStatus('reconnecting');
            
            console.log(`⏳ Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current}/${config.reconnectDelays.length})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else if (reconnectAttemptRef.current >= config.reconnectDelays.length) {
            setError('Maximum reconnection attempts reached');
            console.error('❌ Max reconnection attempts reached');
            updateConnectionStatus('error');
          }
        }
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      setError('Failed to connect');
      updateConnectionStatus('error');
    }
  }, [userId, currentToken, getValidToken, updateConnectionStatus, setupHeartbeat, 
      clearHeartbeat, processMessageQueue, processIncomingMessage, config]);

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

  // Reconnect (disconnect then connect)
  const reconnect = useCallback(() => {
    console.log('🔄 Reconnecting WebSocket');
    disconnect();
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  // Reset connection
  const reset = useCallback(() => {
    disconnect();
    reconnectAttemptRef.current = 0;
    messageQueueRef.current = [];
    deduplicationMapRef.current.clear();
    setMessages([]);
    setError(null);
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  // Auto-connect on mount if userId and token are available
  useEffect(() => {
    if (userId && (currentToken || token)) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, currentToken, token]);

  // Update token when prop changes
  useEffect(() => {
    if (token !== currentToken) {
      setCurrentToken(token);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        reconnect();
      }
    }
  }, [token, currentToken, reconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

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
    reconnect,
    reset,
    
    // Stats
    reconnectAttempts: reconnectAttemptRef.current,
    queuedMessages: messageQueueRef.current.length,
    totalMessages: messages.length
  }), [connectionStatus, error, messages, sendMessage, connect, disconnect, reconnect, reset]);
};

export default usePamWebSocketCore;