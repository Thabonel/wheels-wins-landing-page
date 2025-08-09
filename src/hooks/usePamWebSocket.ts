import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { pamService, type PamMessage, type PamServiceEvents } from '@/services/pamService';
import { useVoiceErrorRecovery } from '@/hooks/useVoiceErrorRecovery';

interface WebSocketMessage {
  type: string;
  message?: string;
  content?: string;
  response?: string;
  audio_url?: string;
  error?: string;
  [key: string]: any;
}

interface UsePamWebSocketOptions {
  autoConnect?: boolean;
  onMessage?: (message: WebSocketMessage | PamMessage) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export interface PamWebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  messages: (WebSocketMessage | PamMessage)[];
  connectionStatus: 'Connected' | 'Connecting' | 'Disconnected';
  reconnectAttempts: number;
  pendingMessages: number;
  voiceEnabled: boolean;
  lastError: Error | null;
}

export const usePamWebSocket = (options: UsePamWebSocketOptions = {}) => {
  const { autoConnect = true, onMessage, onConnectionChange } = options;
  const voiceRecovery = useVoiceErrorRecovery();
  const { toast } = useToast();

  // Enhanced state management
  const [state, setState] = useState<PamWebSocketState>({
    isConnected: false,
    isConnecting: false,
    messages: [],
    connectionStatus: 'Disconnected',
    reconnectAttempts: 0,
    pendingMessages: 0,
    voiceEnabled: true,
    lastError: null
  });

  const [userId, setUserId] = useState<string | null>(null);
  const isInitialized = useRef(false);
  const messageHistory = useRef<(WebSocketMessage | PamMessage)[]>([]);

  // Legacy support - maintain existing state variables for backward compatibility
  const isConnected = state.isConnected;
  const isConnecting = state.isConnecting;
  const messages = state.messages;

  // Get WebSocket URL based on environment
  const getWebSocketUrl = useCallback(() => {
    const isLocal = window.location.hostname === 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    if (isLocal) {
      // Local development
      return `ws://localhost:8000`;
    } else {
      // Production/staging - use the backend URL
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com';
      return backendUrl.replace('https:', 'wss:').replace('http:', 'ws:');
    }
  }, []);

  // Initialize user session and PAM service
  useEffect(() => {
    const initializeUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };

    initializeUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
        disconnect();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initialize PAM service when userId is available
  useEffect(() => {
    if (!userId || isInitialized.current) return;

    console.log('🤖 Initializing enhanced PAM WebSocket service for user:', userId);
    isInitialized.current = true;

    const pamEvents: PamServiceEvents = {
      onMessage: (message: PamMessage) => {
        console.log('📨 PAM service message received:', message);
        
        // Add to message history
        messageHistory.current = [...messageHistory.current.slice(-49), message];
        
        // Update state
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, message]
        }));

        // Call legacy callback for backward compatibility
        onMessage?.(message);
      },

      onConnectionChange: (connected: boolean) => {
        console.log('🔌 PAM service connection changed:', connected);
        
        const serviceStatus = pamService.getConnectionStatus();
        setState(prev => ({
          ...prev,
          isConnected: connected,
          isConnecting: false,
          connectionStatus: connected ? 'Connected' : 'Disconnected',
          reconnectAttempts: serviceStatus.reconnectAttempts,
          pendingMessages: serviceStatus.pendingMessages
        }));

        // Call legacy callback for backward compatibility
        onConnectionChange?.(connected);
      },

      onVoiceStatusChange: (status: 'speaking' | 'idle' | 'error') => {
        console.log('🎙️ PAM voice status changed:', status);
        
        if (status === 'error') {
          voiceRecovery.handleVoiceError(
            new Error('PAM voice synthesis error'),
            'pam_synthesis'
          );
        }
      },

      onError: (error: Error) => {
        console.error('❌ PAM service error:', error);
        
        setState(prev => ({
          ...prev,
          lastError: error
        }));

        // Show user-friendly error message
        toast({
          title: 'PAM Error',
          description: error.message || 'An error occurred with PAM service',
          variant: 'destructive',
        });

        // Use voice error recovery for voice-related errors
        if (error.message.includes('voice') || error.message.includes('speech')) {
          voiceRecovery.handleVoiceError(error, 'pam_service_error');
        }
      }
    };

    // Initialize PAM service with enhanced configuration
    pamService.initialize({}, pamEvents).catch(error => {
      console.error('❌ Failed to initialize PAM service:', error);
      setState(prev => ({
        ...prev,
        lastError: error,
        connectionStatus: 'Disconnected'
      }));
      
      toast({
        title: 'PAM Initialization Failed',
        description: 'Unable to start PAM service. Please try again.',
        variant: 'destructive',
      });
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up PAM service');
      pamService.disconnect();
      isInitialized.current = false;
    };
  }, [userId, onMessage, onConnectionChange, toast, voiceRecovery]);

  // Enhanced send message function using pamService
  const sendMessage = useCallback(async (message: string | object) => {
    try {
      setState(prev => ({ ...prev, isConnecting: true }));
      
      const content = typeof message === 'string' 
        ? message 
        : (message as any).message || (message as any).content || JSON.stringify(message);
      
      const context = typeof message === 'object' && message ? (message as any).context : undefined;
      
      // Send via PAM service
      const messageId = await pamService.sendMessage(content, context);
      
      // Add user message to local state immediately for better UX
      const userMessage: PamMessage = {
        id: `user_${Date.now()}`,
        content,
        role: 'user',
        timestamp: new Date().toISOString(),
        context
      };
      
      messageHistory.current = [...messageHistory.current.slice(-49), userMessage];
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isConnecting: false
      }));
      
      return messageId;
    } catch (error) {
      console.error('❌ Failed to send PAM message:', error);
      setState(prev => ({
        ...prev,
        lastError: error as Error,
        isConnecting: false
      }));
      
      toast({
        title: 'Message Failed',
        description: 'Unable to send message. Please try again.',
        variant: 'destructive',
      });
      
      return false;
    }
  }, [toast]);

  // Enhanced disconnect function using pamService
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting PAM service...');
    pamService.disconnect();
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      connectionStatus: 'Disconnected',
      reconnectAttempts: 0
    }));
  }, []);

  // Enhanced connect function using pamService
  const connect = useCallback(async () => {
    // Don't connect if already connected or connecting
    if (state.isConnected || state.isConnecting) {
      console.log('🔄 PAM already connected or connecting, skipping...');
      return;
    }

    // Don't connect without userId
    if (!userId) {
      console.warn('⚠️ No user ID available for PAM connection');
      return;
    }

    try {
      setState(prev => ({ ...prev, isConnecting: true, lastError: null }));
      console.log('🚀 Connecting to PAM service...');
      
      // Use pamService for connection management
      await pamService.connect();
      
      console.log('✅ PAM service connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to PAM service:', error);
      setState(prev => ({
        ...prev,
        lastError: error as Error,
        isConnecting: false,
        connectionStatus: 'Disconnected'
      }));
      
      toast({
        title: 'Connection Failed',
        description: 'Unable to connect to PAM. Please try again.',
        variant: 'destructive',
      });
      
      throw error;
    }
  }, [userId, state.isConnected, state.isConnecting, toast]);

  // Auto-connect when userId becomes available
  useEffect(() => {
    if (autoConnect && userId && !isConnected && !isConnecting) {
      connect();
    }
  }, [autoConnect, userId, isConnected, isConnecting, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Enhanced clear messages function
  const clearMessages = useCallback(() => {
    messageHistory.current = [];
    setState(prev => ({
      ...prev,
      messages: [],
      lastError: null
    }));
  }, []);

  // Enhanced reconnect function
  const reconnect = useCallback(() => {
    console.log('🔄 Manually reconnecting PAM service...');
    disconnect();
    setTimeout(() => {
      connect();
    }, 100);
  }, [disconnect, connect]);

  // Additional PAM-specific functions
  const setVoiceEnabled = useCallback((enabled: boolean) => {
    pamService.setVoiceOptions({ enabled });
    setState(prev => ({
      ...prev,
      voiceEnabled: enabled
    }));
  }, []);

  const interruptVoice = useCallback(() => {
    pamService.interruptVoice();
  }, []);

  // Voice recovery integration
  useEffect(() => {
    if (voiceRecovery.fallbackMode === 'silent') {
      setVoiceEnabled(false);
    } else if (voiceRecovery.status === 'healthy' && !state.voiceEnabled) {
      setVoiceEnabled(true);
    }
  }, [voiceRecovery.fallbackMode, voiceRecovery.status, state.voiceEnabled, setVoiceEnabled]);

  return {
    // Legacy compatibility
    isConnected,
    isConnecting,
    messages,
    userId,
    
    // Enhanced state
    ...state,
    
    // Core functions
    sendMessage,
    connect,
    disconnect,
    reconnect,
    clearMessages,
    
    // PAM-specific functions
    setVoiceEnabled,
    interruptVoice,
    
    // Computed properties
    hasMessages: state.messages.length > 0,
    lastMessage: state.messages[state.messages.length - 1] || null,
    isHealthy: state.isConnected && !state.lastError,
    
    // Voice recovery integration
    voiceRecovery: {
      status: voiceRecovery.status,
      isRecovering: voiceRecovery.isRecovering,
      fallbackMode: voiceRecovery.fallbackMode,
      triggerRecovery: voiceRecovery.triggerRecovery
    },
    
    // Service status
    serviceStatus: pamService.getConnectionStatus(),
    
    // Message history (read-only)
    messageHistory: messageHistory.current
  };
};

// Export enhanced types
export type UsePamWebSocketReturn = ReturnType<typeof usePamWebSocket>;

// Export a singleton instance for shared WebSocket connection
// Note: The shared instance approach is deprecated in favor of the enhanced pamService singleton
export const useSharedPamWebSocket = (options: UsePamWebSocketOptions = {}) => {
  console.warn('⚠️ useSharedPamWebSocket is deprecated. Use usePamWebSocket directly as pamService is now a singleton.');
  return usePamWebSocket(options);
};