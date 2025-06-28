
import { useState, useEffect, useRef } from 'react';
import { getWebSocketUrl } from '@/services/api';

interface WebSocketMessage {
  type: string;
  message: string;
}

export const usePamWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket endpoint for the PAM backend using configured backend URL
  const wsUrl = getWebSocketUrl('/api/pam/ws');

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  const connect = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
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
      };

      wsRef.current.onerror = () => {
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect to PAM WebSocket:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    isConnected,
    messages,
    sendMessage,
    connect,
  };
};
