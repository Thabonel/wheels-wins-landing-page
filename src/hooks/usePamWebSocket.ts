
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getWebSocketUrl } from '@/services/api';

interface WebSocketMessage {
  type: string;
  message: string;
}

export const usePamWebSocket = (userId: string, token: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // Memoize WebSocket URL to prevent unnecessary recalculations
  const wsUrl = useMemo(() => {
    // Ensure userId is a string
    const userIdString = typeof userId === 'string' ? userId : String(userId);
    const tokenString = typeof token === 'string' ? token : String(token || '');
    
    return `${getWebSocketUrl(`/api/v1/pam/ws/${userIdString}`)}?token=${encodeURIComponent(tokenString)}`;
  }, [userId, token]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0; // Reset on successful connection
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setMessages((prev) => [...prev, message]);
        } catch (error) {
          console.error('Failed to parse PAM message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        // Implement exponential backoff for reconnection
        const maxReconnectAttempts = 5;
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // 1s, 2s, 4s, 8s, 16s
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = () => {
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect to PAM WebSocket:', error);
      setIsConnected(false);
    }
  }, [wsUrl]);

  useEffect(() => {
    connect();
    return () => {
      // Clean up on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    isConnected,
    messages,
    sendMessage,
    connect,
  };
};
