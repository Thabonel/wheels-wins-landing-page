
import { useState, useEffect } from 'react';

interface WebSocketMessage {
  type: string;
  message: string;
}

export const usePamWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  const sendMessage = (message: any) => {
    // Mock WebSocket message sending
    console.log('Sending message:', message);
    return true;
  };

  const connect = () => {
    setIsConnected(true);
  };

  useEffect(() => {
    // Mock connection
    setTimeout(() => setIsConnected(true), 1000);
  }, []);

  return {
    isConnected,
    messages,
    sendMessage,
    connect,
  };
};
