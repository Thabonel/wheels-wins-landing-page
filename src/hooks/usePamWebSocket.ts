
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
  const maxReconnectAttempts = 3;
  const connectionAttempted = useRef(false);

  const connect = useCallback(() => {
    if (!user?.id || ws.current?.readyState === WebSocket.OPEN) return;

    // Clear any existing timeouts
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    try {
      // Use the correct WebSocket URL for our PAM backend
      const wsUrl = `wss://pam-backend.onrender.com/ws/${user.id}?token=demo-token`;
      console.log('🔌 Attempting PAM WebSocket connection:', wsUrl);
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ PAM WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Send initial connection message
        setMessages(prev => [...prev, {
          type: 'connection',
          message: '🤖 PAM is ready! I can help with expenses, travel planning, and more.'
        }]);
      };

      ws.current.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log('📨 PAM WebSocket message received:', message);
          setMessages(prev => [...prev, message]);

          // Handle different message types from our new backend
          switch (message.type) {
            case 'chat_response':
              console.log('💬 Chat response from PAM backend:', message.message);
              break;
              
            case 'ui_actions':
              console.log('🎯 Executing UI actions:', message.actions);
              await executeUIActions(message.actions || []);
              break;
              
            case 'action_response':
              if (message.status === 'completed') {
                console.log('✅ PAM action completed:', message);
              }
              break;
              
            case 'error':
              console.error('❌ PAM backend error:', message.message);
              break;
              
            case 'connection':
              console.log('🔗 PAM connection status:', message.message);
              break;

            case 'wins_update':
              console.log('🏆 WINS data updated:', message);
              break;
          }
        } catch (error) {
          console.error('❌ Error parsing PAM WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('🔌 PAM WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ PAM WebSocket error:', error);
        setIsConnected(false);
        
        // If connection fails immediately, try to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('❌ Failed to create PAM WebSocket:', error);
      setIsConnected(false);
      
      if (reconnectAttempts.current < maxReconnectAttempts) {
        scheduleReconnect();
      }
    }
  }, [user?.id]);

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
      
      // Set a fallback message to let user know connection failed
      setMessages(prev => [...prev, {
        type: 'error',
        message: '⚠️ Unable to connect to PAM backend. Please refresh the page to try again.'
      }]);
    }
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending message to PAM backend:', message);
      ws.current.send(JSON.stringify(message));
      return true;
    } else {
      console.error('❌ PAM WebSocket is not connected, cannot send message');
      
      // Attempt to reconnect if not connected
      if (!isConnected && reconnectAttempts.current < maxReconnectAttempts) {
        connect();
      }
      
      return false;
    }
  }, [isConnected, connect]);

  const executeUIActions = async (actions: any[]) => {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'navigate':
            await pamUIController.navigateToPage(action.target, action.params);
            console.log('🧭 PAM navigated to:', action.target);
            break;
            
          case 'fill_form':
            for (const [field, value] of Object.entries(action.data || {})) {
              await pamUIController.fillInput(`#${field}`, value);
              console.log('📝 PAM filled field:', field, 'with:', value);
            }
            break;
            
          case 'click':
            await pamUIController.clickButton(action.selector);
            console.log('👆 PAM clicked:', action.selector);
            break;
            
          case 'workflow':
            await pamUIController.executeWorkflow(action.steps);
            console.log('⚙️ PAM executed workflow with', action.steps.length, 'steps');
            break;
            
          case 'alert':
            console.log('💡 PAM alert:', action.content);
            break;
            
          default:
            console.log('❓ Unknown PAM action type:', action.type);
        }
      } catch (error) {
        console.error('❌ Error executing PAM UI action:', error);
      }
    }
  };

  useEffect(() => {
    if (user?.id && !connectionAttempted.current) {
      connectionAttempted.current = true;
      console.log('🚀 Initiating PAM WebSocket connection for user:', user.id);
      connect();
    }

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        console.log('🔌 Closing PAM WebSocket connection');
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [user?.id, connect]);

  return {
    isConnected,
    sendMessage,
    messages,
    connect, // Expose connect function for manual reconnection
  };
}
