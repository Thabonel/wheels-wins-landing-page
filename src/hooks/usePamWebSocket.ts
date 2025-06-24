
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

interface WebSocketMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: number;
  type?: string;
  message?: string;
}

export const usePamWebSocket = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState<string>('');

  const sendMessage = (content: string) => {
    if (wsRef.current && isConnected && user?.id) {
      const payload = { 
        type: 'chat',
        message: content,
        user_id: user.id 
      };
      console.log('📤 Sending WebSocket message:', payload);
      wsRef.current.send(JSON.stringify(payload));
    } else {
      console.error('❌ Cannot send message - WebSocket not connected or user not available', {
        wsConnected: wsRef.current?.readyState === WebSocket.OPEN,
        isConnected,
        userId: user?.id
      });
    }
  };

  useEffect(() => {
    if (!user?.id) {
      console.log('⏳ Waiting for user authentication...');
      return;
    }

    const wsUrl = `wss://pam-backend.onrender.com/ws/${user.id}?token=demo-token`;
    console.log('🔌 Attempting WebSocket connection to:', wsUrl);
    console.log('👤 User ID:', user.id);
    console.log('🌐 Current origin:', window.location.origin);
    
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('✅ WebSocket connected successfully');
      console.log('🔗 Connection details:', {
        readyState: socket.readyState,
        url: socket.url,
        protocol: socket.protocol
      });
      setIsConnected(true);
      setConnectionAttempts(0);
      setLastError('');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data);
        
        if (data.type === 'chat_response') {
          const message: WebSocketMessage = {
            id: data.timestamp || Date.now().toString(),
            role: 'assistant',
            content: data.message || 'Processing...',
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, message]);
        } else if (data.type === 'connection') {
          console.log('🤝 Connection acknowledged:', data.message);
        } else {
          console.log('📋 Other message type received:', data.type, data);
        }
      } catch (e) {
        console.error('❌ Invalid WebSocket message format:', e, event.data);
      }
    };

    socket.onclose = (event) => {
      console.log('🔌 WebSocket disconnected:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      
      // Log specific close codes for debugging
      const closeReasons = {
        1000: 'Normal closure',
        1001: 'Going away',
        1002: 'Protocol error',
        1003: 'Unsupported data',
        1006: 'Abnormal closure',
        1007: 'Invalid frame payload data',
        1008: 'Policy violation',
        1009: 'Message too big',
        1010: 'Mandatory extension',
        1011: 'Internal server error',
        1015: 'TLS handshake failure'
      };
      
      const reason = closeReasons[event.code as keyof typeof closeReasons] || 'Unknown reason';
      console.log(`🔍 Close code ${event.code}: ${reason}`);
      
      setIsConnected(false);
      setLastError(`Connection closed: ${reason} (${event.code})`);
    };

    socket.onerror = (error) => {
      console.error('❌ WebSocket error occurred:', error);
      console.log('🔍 WebSocket state:', {
        readyState: socket.readyState,
        url: socket.url,
        states: {
          CONNECTING: WebSocket.CONNECTING,
          OPEN: WebSocket.OPEN,
          CLOSING: WebSocket.CLOSING,
          CLOSED: WebSocket.CLOSED
        }
      });
      
      setConnectionAttempts(prev => prev + 1);
      setLastError('WebSocket connection error');
      setIsConnected(false);
    };

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, 'Component unmounting');
      }
    };
  }, [user?.id]);

  // Log connection status changes
  useEffect(() => {
    console.log('📊 PAM WebSocket Status:', {
      isConnected,
      connectionAttempts,
      lastError,
      userId: user?.id
    });
  }, [isConnected, connectionAttempts, lastError, user?.id]);

  return { isConnected, messages, sendMessage, connectionAttempts, lastError };
};
