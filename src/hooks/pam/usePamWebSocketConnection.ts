
import { useRef, useState, useCallback } from 'react';

interface WebSocketConnectionConfig {
  userId: string;
  onMessage: (message: any) => void;
  onStatusChange: (isConnected: boolean) => void;
}

export function usePamWebSocketConnection({ userId, onMessage, onStatusChange }: WebSocketConnectionConfig) {
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
  }, []);

  const connect = useCallback(() => {
    if (!userId || ws.current?.readyState === WebSocket.OPEN) return;

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    try {
      const backendUrl = import.meta.env.VITE_PAM_BACKEND_URL || "https://pam-backend.onrender.com";
      const wsUrl = `${backendUrl.replace("https", "wss")}/ws/${userId}?token=${localStorage.getItem("auth-token") || "demo-token"}`;
      console.log('🔌 Attempting PAM WebSocket connection:', wsUrl);
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ PAM WebSocket connected successfully');
        updateConnectionStatus(true);
        reconnectAttempts.current = 0;
        
        onMessage({
          type: 'connection',
          message: '🤖 PAM is ready! I can help with expenses, travel planning, and more.'
        });
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 PAM WebSocket message received:', message);
          onMessage(message);
        } catch (error) {
          console.error('❌ Error parsing PAM WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('🔌 PAM WebSocket disconnected:', event.code, event.reason);
        updateConnectionStatus(false);
        
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.current.onerror = (error) => {
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
      }
    }
  }, [userId, onMessage, updateConnectionStatus, scheduleReconnect]);

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
