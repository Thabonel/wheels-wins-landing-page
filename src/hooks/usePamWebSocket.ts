
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getWebSocketUrl } from '@/services/api';

interface WebSocketMessage {
  type: string;
  message: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// DISABLED: Using usePamWebSocketUnified instead
// export const usePamWebSocket = (userId: string, token: string) => {
const usePamWebSocket = (userId: string, token: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const messageQueue = useRef<any[]>([]);
  
  // Deduplication tracking
  const lastMessageRef = useRef<string>("");
  const lastMessageTimeRef = useRef<number>(0);
  const messageIdsRef = useRef<Set<string>>(new Set());

  // Memoize WebSocket URL to prevent unnecessary recalculations
  const wsUrl = useMemo(() => {
    // Ensure userId is a string
    const userIdString = typeof userId === 'string' ? userId : String(userId);
    const tokenString = typeof token === 'string' ? token : String(token || '');
    
    return `${getWebSocketUrl(`/api/v1/pam/ws/${userIdString}`)}?token=${encodeURIComponent(tokenString)}`;
  }, [userId, token]);

  const sendMessage = useCallback((message: any) => {
    if (!message) {
      console.warn('Attempted to send empty message to PAM WebSocket');
      return false;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        console.log('Message sent to PAM:', message);
        return true;
      } catch (error) {
        console.error('Error sending message to PAM:', error);
        return false;
      }
    } else {
      // Queue message if not connected
      messageQueue.current.push(message);
      console.log('Message queued (WebSocket not ready):', message);
      
      // Attempt to connect if not already connecting
      if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
        connect().catch(console.error);
      }
      return false;
    }
  }, [connectionStatus]);

  const connect = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // If already connected, resolve immediately
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setConnectionStatus('connected');
        resolve();
        return;
      }

      // If currently connecting, wait for connection to complete
      if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        const checkConnection = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection);
            setConnectionStatus('connected');
            resolve();
          } else if (wsRef.current?.readyState === WebSocket.CLOSED || wsRef.current?.readyState === WebSocket.CLOSING) {
            clearInterval(checkConnection);
            setConnectionStatus('error');
            reject(new Error('WebSocket connection failed'));
          }
        }, 100);
        return;
      }

      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      try {
        setConnectionStatus('connecting');
        console.log('PAM WebSocket connecting to:', wsUrl);
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('PAM WebSocket connected successfully');
          setIsConnected(true);
          setConnectionStatus('connected');
          reconnectAttempts.current = 0; // Reset on successful connection
          
          // Process queued messages
          if (messageQueue.current.length > 0) {
            console.log(`Processing ${messageQueue.current.length} queued messages`);
            const queue = [...messageQueue.current];
            messageQueue.current = [];
            
            queue.forEach(queuedMessage => {
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                try {
                  wsRef.current.send(JSON.stringify(queuedMessage));
                  console.log('Queued message sent:', queuedMessage);
                } catch (error) {
                  console.error('Error sending queued message:', error);
                }
              }
            });
          }
          
          resolve();
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Filter out system messages that shouldn't be shown to users
            // PAM is a travel companion, not a system reporting status
            const systemMessageTypes = ['init_ack', 'system', 'debug', 'status'];
            if (systemMessageTypes.includes(message.type)) {
              console.log('System message received (not shown to user):', message);
              return;
            }
            
            // Enhanced deduplication logic
            const messageContent = message.content || message.message || JSON.stringify(message);
            const messageId = message.id || message.message_id || `${message.type}_${Date.now()}`;
            const currentTime = Date.now();
            
            // Check if we've seen this message ID before
            if (messageIdsRef.current.has(messageId)) {
              console.log('Duplicate message blocked by ID:', messageId);
              return;
            }
            
            // Check if this is the same message content within 500ms (duplicate send)
            if (messageContent === lastMessageRef.current && 
                currentTime - lastMessageTimeRef.current < 500) {
              console.log('Duplicate message blocked by content/timing:', messageContent.substring(0, 50));
              return;
            }
            
            // Update deduplication tracking
            messageIdsRef.current.add(messageId);
            lastMessageRef.current = messageContent;
            lastMessageTimeRef.current = currentTime;
            
            // Clean up old message IDs to prevent memory growth
            if (messageIdsRef.current.size > 100) {
              const idsArray = Array.from(messageIdsRef.current);
              messageIdsRef.current = new Set(idsArray.slice(-50));
            }
            
            // Prevent duplicate messages in state
            setMessages((prev) => {
              // Check if this exact message already exists (within last 5 messages to avoid memory issues)
              const recentMessages = prev.slice(-5);
              const isDuplicate = recentMessages.some(msg => {
                // Check for duplicate based on content and timestamp (within 1 second)
                if (msg.content === message.content || msg.message === message.message) {
                  const msgTime = new Date(msg.timestamp || 0).getTime();
                  const newTime = new Date(message.timestamp || 0).getTime();
                  const timeDiff = Math.abs(newTime - msgTime);
                  return timeDiff < 1000; // Consider duplicate if within 1 second
                }
                return false;
              });
              
              if (isDuplicate) {
                console.log('Duplicate message filtered:', message);
                return prev;
              }
              
              return [...prev, message];
            });
          } catch (error) {
            console.error('Failed to parse PAM message:', error);
          }
        };

        wsRef.current.onclose = (event) => {
          console.log('PAM WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          setConnectionStatus('disconnected');
          
          // Implement exponential backoff for reconnection
          const maxReconnectAttempts = 5;
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.pow(2, reconnectAttempts.current) * 1000; // 1s, 2s, 4s, 8s, 16s
            reconnectAttempts.current++;
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect().catch(console.error);
            }, delay);
          } else {
            console.log('Max reconnection attempts reached');
            setConnectionStatus('error');
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('PAM WebSocket error:', error);
          setIsConnected(false);
          setConnectionStatus('error');
          reject(new Error(`WebSocket connection error: ${error}`));
        };
      } catch (error) {
        console.error('Failed to connect to PAM WebSocket:', error);
        setIsConnected(false);
        setConnectionStatus('error');
        reject(error);
      }
    });
  }, [wsUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    messageQueue.current = []; // Clear any queued messages
    reconnectAttempts.current = 0;
  }, []);

  useEffect(() => {
    // Only connect if we have a valid token
    if (token && token.trim()) {
      connect().catch(error => {
        console.error('Initial PAM WebSocket connection failed:', error);
      });
    }
    return () => {
      // Clean up on unmount
      disconnect();
    };
  }, [token]); // Remove connect from dependencies to avoid infinite loop

  return {
    isConnected,
    messages,
    sendMessage,
    connect,
    disconnect,
    connectionStatus,
    isConnecting: connectionStatus === 'connecting',
  };
};

// Redirect to unified implementation
export { usePamWebSocketUnified as usePamWebSocket } from './pam/usePamWebSocketUnified';
