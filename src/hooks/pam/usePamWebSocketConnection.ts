import { useRef, useState, useCallback, useEffect } from 'react';
import { getWebSocketUrl } from '@/services/api';
import { jwtDecode } from 'jwt-decode';

interface WebSocketConnectionConfig {
  userId: string;
  token?: string;
  onMessage: (message: any) => void;
  onStatusChange: (isConnected: boolean) => void;
}

export function usePamWebSocketConnection({ userId, token, onMessage, onStatusChange }: WebSocketConnectionConfig) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const pingInterval = useRef<NodeJS.Timeout>();
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
  }, [onMessage]);

  const validateToken = useCallback((tokenToValidate: string): boolean => {
    if (!tokenToValidate || tokenToValidate === 'demo-token') return true; // Allow demo mode
    
    try {
      const decoded = jwtDecode(tokenToValidate) as any;
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (decoded.exp && decoded.exp < currentTime) {
        console.error('🔐 PAM Token expired:', {
          exp: decoded.exp,
          current: currentTime,
          expired_ago: currentTime - decoded.exp
        });
        return false;
      }
      
      console.log('✅ PAM Token validation passed:', {
        userId: decoded.sub,
        exp: decoded.exp,
        time_to_expiry: decoded.exp - currentTime
      });
      return true;
    } catch (error) {
      console.error('❌ PAM Token validation failed:', error);
      return false;
    }
  }, []);

  const connect = useCallback(() => {
    if (!userId || ws.current?.readyState === WebSocket.OPEN) return;

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    // Validate token before connection attempt
    const tokenToUse = token || userId || 'demo-token';
    if (!validateToken(tokenToUse)) {
      console.error('❌ PAM Connection aborted: Invalid or expired token');
      onMessage({
        type: 'error',
        message: '🔐 Authentication token expired. Please refresh the page to continue.'
      });
      return;
    }

    try {
      const wsUrl = `${getWebSocketUrl('/api/v1/pam/ws')}?token=${encodeURIComponent(tokenToUse)}`;
      console.log('🔌 Attempting PAM WebSocket connection:', wsUrl);
      
      ws.current = new WebSocket(wsUrl);

      // Connection timeout for premium Render.com plan (fast response expected)
      const connectionTimeout = setTimeout(() => {
        if (ws.current?.readyState !== WebSocket.OPEN) {
          console.warn('⏰ PAM WebSocket connection timeout after 10 seconds');
          ws.current?.close();
          updateConnectionStatus(false);
          scheduleReconnect();
        }
      }, 10000); // 10 second timeout - premium plan with guaranteed uptime

      ws.current.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('✅ PAM WebSocket connected successfully');
        updateConnectionStatus(true);
        reconnectAttempts.current = 0;
        
        // Start ping/pong heartbeat mechanism
        pingInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            console.log('🏓 Sending ping to PAM backend');
            ws.current.send(JSON.stringify({ type: 'ping' }));
          } else {
            console.warn('⚠️ WebSocket not open, clearing ping interval');
            if (pingInterval.current) {
              clearInterval(pingInterval.current);
            }
          }
        }, 15000); // Ping every 15 seconds
        
        // Add a small delay to ensure connection is fully established
        setTimeout(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            // Send initial authentication message
            ws.current.send(JSON.stringify({
              type: 'auth',
              userId,
              timestamp: Date.now()
            }));
          }
        }, 100);
        
        onMessage({
          type: 'connection',
          message: '🤖 PAM is now online! I can help with expenses, travel planning, and more.'
        });
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle pong responses for heartbeat
          if (message.type === 'pong') {
            console.log('🏓 Received pong from PAM backend - connection healthy');
            return; // Don't pass pong messages to UI
          }
          
          console.log('📨 PAM WebSocket message received:', message);
          onMessage(message);
        } catch (error) {
          console.error('❌ Error parsing PAM WebSocket message:', error);
          // Still notify with raw message if JSON parse fails
          onMessage({
            type: 'message',
            message: event.data
          });
        }
      };

      ws.current.onclose = (event) => {
        clearTimeout(connectionTimeout);
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }
        
        console.log('🔌 PAM WebSocket disconnected:', event.code, event.reason);
        updateConnectionStatus(false);
        
        // Handle different close codes
        if (event.code === 4000 || event.code === 401) {
          // Authentication error - don't reconnect, show error
          onMessage({
            type: 'error',
            message: '🔐 Authentication failed. Please refresh the page to reconnect.'
          });
          return;
        }
        
        // Only reconnect if it wasn't a normal closure and we haven't exceeded attempts
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          onMessage({
            type: 'error',
            message: '❌ PAM backend is currently unavailable. Running in demo mode.'
          });
        }
      };

      ws.current.onerror = (error) => {
        clearTimeout(connectionTimeout);
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
      } else {
        onMessage({
          type: 'error',
          message: '❌ Unable to connect to PAM backend. Using demo mode.'
        });
      }
    }
  }, [userId, token, onMessage, updateConnectionStatus, scheduleReconnect, validateToken]);

  // Auto-connect when userId changes
  useEffect(() => {
    if (userId) {
      connect();
    }
    
    // Cleanup on unmount
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
      }
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [userId, connect]);

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
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
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
