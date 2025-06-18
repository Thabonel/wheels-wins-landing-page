
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { pamUIController } from '@/lib/pam/PamUIController';

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
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!user?.id || ws.current?.readyState === WebSocket.OPEN) return;

    try {
      // Connect to your PAM backend
      const wsUrl = `wss://pam-backend.onrender.com/ws/${user.id}?token=demo-token`;
      console.log('🔌 Connecting to PAM WebSocket:', wsUrl);
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ PAM WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Send initial connection message
        setMessages(prev => [...prev, {
          type: 'connection',
          message: '🤖 PAM is ready to assist you!'
        }]);
      };

      ws.current.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log('📨 PAM WebSocket message:', message);
          setMessages(prev => [...prev, message]);

          // Handle different message types
          switch (message.type) {
            case 'chat_response':
              // Message will be handled by the component
              break;
              
            case 'ui_actions':
              await executeUIActions(message.actions || []);
              break;
              
            case 'action_response':
              if (message.status === 'completed') {
                console.log('✅ Action completed:', message);
              }
              break;
              
            case 'error':
              console.error('❌ PAM error:', message.message);
              break;
              
            case 'connection':
              console.log('🔗 Connection status:', message.message);
              break;
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('🔌 PAM WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        if (event.code !== 1000) { // Not a normal closure
          scheduleReconnect();
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ PAM WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
      scheduleReconnect();
    }
  }, [user?.id]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
      
      reconnectTimeout.current = setTimeout(() => {
        reconnectAttempts.current++;
        connect();
      }, delay);
    } else {
      console.error('❌ Max reconnect attempts reached');
    }
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending message to PAM:', message);
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('❌ WebSocket is not connected, cannot send message');
    }
  }, []);

  const executeUIActions = async (actions: any[]) => {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'navigate':
            await pamUIController.navigateToPage(action.target, action.params);
            console.log('🧭 Navigated to:', action.target);
            break;
            
          case 'fill_form':
            for (const [field, value] of Object.entries(action.data || {})) {
              await pamUIController.fillInput(`#${field}`, value);
              console.log('📝 Filled field:', field, 'with:', value);
            }
            break;
            
          case 'click':
            await pamUIController.clickButton(action.selector);
            console.log('👆 Clicked:', action.selector);
            break;
            
          case 'workflow':
            await pamUIController.executeWorkflow(action.steps);
            console.log('⚙️ Executed workflow with', action.steps.length, 'steps');
            break;
            
          case 'alert':
            console.log('💡 Alert:', action.content);
            break;
            
          default:
            console.log('❓ Unknown action type:', action.type);
        }
      } catch (error) {
        console.error('❌ Error executing UI action:', error);
      }
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
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [user?.id, connect]);

  return {
    isConnected,
    sendMessage,
    messages,
  };
}
