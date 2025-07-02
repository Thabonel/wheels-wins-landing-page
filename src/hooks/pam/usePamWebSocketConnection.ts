import { useRef, useState, useCallback, useEffect } from 'react';
import { getWebSocketUrl } from '@/services/api';

interface WebSocketConnectionConfig {
  userId: string;
  token?: string;
  onMessage: (message: any) => void;
  onStatusChange: (isConnected: boolean) => void;
}

export function usePamWebSocketConnection({ userId, token, onMessage, onStatusChange }: WebSocketConnectionConfig) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  const updateConnectionStatus = useCallback((connected: boolean) => {
    setIsConnected(connected);
    onStatusChange(connected);
  }, [onStatusChange]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
      console.log(`🔄 Scheduling PAM reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
      
      reconnectTimeout.current = setTimeout(() => {
        reconnectAttempts.current++;
        connect();
      }, delay);
    } else {
      console.error('❌ Max PAM reconnect attempts reached');
      onMessage({
        type: 'error',
        message: '⚠️ Unable to connect to PAM backend. Please refresh the page to try again.'
      });
    }
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!userId || ws.current?.readyState === WebSocket.OPEN) return;

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    try {
      const wsUrl = `${getWebSocketUrl('/api/ws')}?token=${encodeURIComponent(token || userId || 'demo-token')}`;
      console.log('🔌 Attempting PAM WebSocket connection:', wsUrl);
      
      ws.current = new WebSocket(wsUrl);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.current?.readyState !== WebSocket.OPEN) {
          console.warn('⏰ PAM WebSocket connection timeout');
          ws.current?.close();
          updateConnectionStatus(false);
          scheduleReconnect();
        }
      }, 10000); // 10 second timeout

      ws.current.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('✅ PAM WebSocket connected successfully');
        updateConnectionStatus(true);
        reconnectAttempts.current = 0;
        
        // Send initial connection message
        ws.current?.send(JSON.stringify({
          type: 'connection',
          userId,
          timestamp: Date.now()
        }));
        
        onMessage({
          type: 'connection',
          message: '🤖 PAM is now online! I can help with expenses, travel planning, and more.'
        });
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 PAM WebSocket message received:', message);
          onMessage(message);
        } catch (error) {
          console.error('❌ Error parsing PAM WebSocket message:', error);
          // Still notify with raw message if JSON parse fails
          onMessage({
            type: 'message',
            message: event.data
          });
        }
      };

      ws.current.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('🔌 PAM WebSocket disconnected:', event.code, event.reason);
        updateConnectionStatus(false);
        
        // Only reconnect if it wasn't a normal closure and we haven't exceeded attempts
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          onMessage({
            type: 'error',
            message: '❌ PAM backend is currently unavailable. Running in demo mode.'
          });
        }
      };

      ws.current.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('❌ PAM WebSocket error:', error);
        updateConnectionStatus(false);
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('❌ Failed to create PAM WebSocket:', error);
      updateConnectionStatus(false);
      
      if (reconnectAttempts.current < maxReconnectAttempts) {
        scheduleReconnect();
      } else {
        onMessage({
          type: 'error',
          message: '❌ Unable to connect to PAM backend. Using demo mode.'
        });
      }
    }
  }, [userId, token, onMessage, updateConnectionStatus, scheduleReconnect]);

  // Auto-connect when userId changes
  useEffect(() => {
    if (userId) {
      connect();
    }
    
    // Cleanup on unmount
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [userId, connect]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending message to PAM backend:', message);
      ws.current.send(JSON.stringify(message));
      return true;
    } else {
      console.error('❌ PAM WebSocket is not connected, cannot send message');
      
      if (!isConnected && reconnectAttempts.current < maxReconnectAttempts) {
        connect();
      }
      
      return false;
    }
  }, [isConnected, connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      console.log('🔌 Closing PAM WebSocket connection');
      ws.current.close(1000, 'Component unmounting');
    }
  }, []);

  return {
    isConnected,
    connect,
    sendMessage,
    disconnect
  };
}
