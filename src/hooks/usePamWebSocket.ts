import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

interface WebSocketMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export const usePamWebSocket = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const sendMessage = (content: string) => {
    if (wsRef.current && isConnected && user?.id) {
      const payload = { user_id: user.id, message: content };
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  useEffect(() => {
    const url = import.meta.env.VITE_PAM_WS_URL;
    const socket = new WebSocket(url);
    wsRef.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        setMessages(prev => [...prev, data]);
      } catch (e) {
        console.error('Invalid message format', e);
      }
    };
    socket.onclose = () => setIsConnected(false);
    socket.onerror = (err) => console.error('WebSocket error', err);

    return () => {
      socket.close();
    };
  }, [user?.id]);

  return { isConnected, messages, sendMessage };
};
