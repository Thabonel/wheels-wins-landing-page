import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getWebSocketUrl } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { jwtDecode } from 'jwt-decode';

interface WebSocketMessage {
  type: string;
  message: string;
  timestamp?: string;
  data?: any;
}

interface TokenInfo {
  token: string;
  expiresAt: number;
  isValid: boolean;
}

export const usePamWebSocketEnhanced = (userId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tokenMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const [currentToken, setCurrentToken] = useState<TokenInfo | null>(null);

  // Get a valid access token with automatic refresh
  const getValidAccessToken = useCallback(async (): Promise<TokenInfo> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.access_token) {
        throw new Error('No valid session');
      }

      const token = session.access_token;
      
      // Decode token to check expiration
      const decoded = jwtDecode(token) as any;
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      // If token expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('🔄 Token expiring soon, refreshing...');
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !newSession?.access_token) {
          throw new Error('Failed to refresh token');
        }
        
        const newDecoded = jwtDecode(newSession.access_token) as any;
        return {
          token: newSession.access_token,
          expiresAt: newDecoded.exp * 1000,
          isValid: true
        };
      }
      
      return {
        token,
        expiresAt,
        isValid: true
      };
    } catch (error) {
      console.error('❌ Failed to get valid access token:', error);
      return {
        token: '',
        expiresAt: 0,
        isValid: false
      };
    }
  }, []);

  // Monitor token expiration and reconnect when needed
  const startTokenMonitoring = useCallback(() => {
    // Clear existing monitor
    if (tokenMonitorRef.current) {
      clearInterval(tokenMonitorRef.current);
    }

    // Check token every minute
    tokenMonitorRef.current = setInterval(async () => {
      if (!currentToken || !wsRef.current) return;
      
      const now = Date.now();
      const timeUntilExpiry = currentToken.expiresAt - now;
      
      // If token expires in less than 5 minutes, refresh and reconnect
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('🔄 Token expiring soon, refreshing WebSocket connection...');
        
        const newTokenInfo = await getValidAccessToken();
        if (newTokenInfo.isValid) {
          setCurrentToken(newTokenInfo);
          disconnect();
          connect();
        }
      }
    }, 60000); // Check every minute
  }, [currentToken, getValidAccessToken]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (tokenMonitorRef.current) {
      clearInterval(tokenMonitorRef.current);
      tokenMonitorRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Disconnecting');
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const connect = useCallback(async () => {
    // Don't connect if already connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      // Get a valid token before connecting
      const tokenInfo = await getValidAccessToken();
      
      if (!tokenInfo.isValid) {
        setConnectionError('Authentication failed. Please sign in again.');
        return;
      }
      
      setCurrentToken(tokenInfo);
      setConnectionError(null);
      
      const wsUrl = `${getWebSocketUrl(`/api/v1/pam/ws/${user.id}`)}?token=${encodeURIComponent(tokenInfo.token)}`;
      console.log('🔌 Connecting to PAM WebSocket...');
      
      wsRef.current = new WebSocket(wsUrl);

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          console.warn('⏰ WebSocket connection timeout');
          wsRef.current?.close();
          setConnectionError('Connection timeout. Retrying...');
        }
      }, 10000);

      wsRef.current.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('✅ PAM WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Start token monitoring
        startTokenMonitoring();
        
        // Send initial auth message
        sendMessage({
          type: 'auth',
          userId,
          timestamp: new Date().toISOString()
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Don't add pong messages to the message list
          if (message.type !== 'pong') {
            setMessages((prev) => [...prev, message]);
          }
          
          // Handle specific message types
          if (message.type === 'error' && message.code === 'AUTH_EXPIRED') {
            console.log('🔐 Auth expired, refreshing token...');
            disconnect();
            connect();
          }
        } catch (error) {
          console.error('Failed to parse PAM message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        clearTimeout(connectionTimeout);
        setIsConnected(false);
        
        // Stop token monitoring
        if (tokenMonitorRef.current) {
          clearInterval(tokenMonitorRef.current);
          tokenMonitorRef.current = null;
        }
        
        // Handle different close codes
        if (event.code === 4000 || event.code === 1008) {
          // Authentication error
          setConnectionError('Authentication failed. Please sign in again.');
          return;
        }
        
        // Implement exponential backoff for reconnection
        const maxReconnectAttempts = 5;
        if (reconnectAttempts.current < maxReconnectAttempts && event.code !== 1000) {
          const delay = Math.min(Math.pow(2, reconnectAttempts.current) * 1000, 30000);
          reconnectAttempts.current++;
          
          console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          setConnectionError(`Connection lost. Reconnecting in ${delay/1000}s...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionError('Unable to connect to PAM. Please refresh the page.');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect to PAM WebSocket:', error);
      setIsConnected(false);
      setConnectionError('Failed to establish connection. Please try again.');
    }
  }, [userId, getValidAccessToken, sendMessage, disconnect, startTokenMonitoring]);

  // Send ping messages to keep connection alive
  useEffect(() => {
    if (!isConnected) return;
    
    const pingInterval = setInterval(() => {
      sendMessage({
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }, 30000); // Ping every 30 seconds
    
    return () => clearInterval(pingInterval);
  }, [isConnected, sendMessage]);

  // Connect on mount and handle auth state changes
  useEffect(() => {
    if (userId) {
      connect();
    }
    
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        disconnect();
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Auth token refreshed, reconnecting WebSocket...');
        disconnect();
        connect();
      }
    });
    
    return () => {
      disconnect();
      authListener.subscription.unsubscribe();
    };
  }, [userId, connect, disconnect]);

  return {
    isConnected,
    messages,
    sendMessage,
    connect,
    disconnect,
    connectionError,
  };
};