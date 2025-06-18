import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { pamUIController } from '@/lib/pam/PamUIController';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function usePamWebSocket() {
  const { user } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (!user?.id || ws.current?.readyState === WebSocket.OPEN) return;

    try {
      // Get the backend URL from environment or use default
      const wsUrl = process.env.NODE_ENV === 'production'
        ? 'wss://pam-backend.onrender.com'
        : 'ws://localhost:8000';
      
      const token = localStorage.getItem('auth-token') || 'demo-token';
      ws.current = new WebSocket(`${wsUrl}/ws/${user.id}?token=${token}`);

      ws.current.onopen = () => {
        console.log('PAM WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = async (event) => {
        const message = JSON.parse(event.data) as WebSocketMessage;
        console.log('PAM WebSocket message:', message);
        setMessages(prev => [...prev, message]);

        // Handle different message types
        switch (message.type) {
          case 'action_response':
            await handleActionResponse(message);
            break;
          case 'ui_action':
            await executeUIAction(message);
            break;
        }
      };

      ws.current.onclose = () => {
        console.log('PAM WebSocket disconnected');
        setIsConnected(false);
        scheduleReconnect();
      };

      ws.current.onerror = (error) => {
        console.error('PAM WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      scheduleReconnect();
    }
  }, [user?.id]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current < 5) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectTimeout.current = setTimeout(() => {
        reconnectAttempts.current++;
        connect();
      }, delay);
    }
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  const handleActionResponse = async (message: WebSocketMessage) => {
    if (message.status === 'completed' && message.result) {
      // Show success feedback
      console.log('Action completed:', message.result);
    }
  };

  const executeUIAction = async (message: WebSocketMessage) => {
    const { action } = message;
    if (!action) return;

    try {
      switch (action.type) {
        case 'navigate':
          await pamUIController.navigateToPage(action.target, action.params);
          break;
        case 'fill_form':
          for (const [field, value] of Object.entries(action.data || {})) {
            await pamUIController.fillInput(`#${field}`, value);
          }
          break;
        case 'click':
          await pamUIController.clickButton(action.selector);
          break;
        case 'workflow':
          await pamUIController.executeWorkflow(action.steps);
          break;
      }
    } catch (error) {
      console.error('Error executing UI action:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user?.id, connect]);

  return {
    isConnected,
    sendMessage,
    messages,
  };
}
