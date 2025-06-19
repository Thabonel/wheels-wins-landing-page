
import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePamWebSocketConnection } from './pam/usePamWebSocketConnection';
import { usePamMessageHandler } from './pam/usePamMessageHandler';

interface WebSocketMessage {
  type: string;
  message?: string;
  actions?: any[];
  user_id?: string;
  context?: any;
  [key: string]: any;
}

export function usePamWebSocket() {
  const { user } = useAuth();
  const connectionAttempted = useRef(false);
  const { messages, handleMessage } = usePamMessageHandler();
  
  const { isConnected, connect, sendMessage, disconnect } = usePamWebSocketConnection({
    userId: user?.id || '',
    onMessage: handleMessage,
    onStatusChange: () => {} // Could be used for additional status handling
  });

  useEffect(() => {
    if (user?.id && !connectionAttempted.current) {
      connectionAttempted.current = true;
      console.log('🚀 Initiating PAM WebSocket connection for user:', user.id);
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    messages,
    connect,
  };
}
