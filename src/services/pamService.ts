/**
 * PAM Service - Personal AI Manager Communication Service
 * 
 * Comprehensive service for managing PAM interactions with:
 * - WebSocket connection management with authentication
 * - Voice synthesis integration with error recovery
 * - Message handling with fallback mechanisms
 * - Reconnection logic with exponential backoff
 * - Integration with error recovery system
 */

import { supabase } from '@/integrations/supabase/client';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { voiceOrchestrator } from '@/services/VoiceOrchestrator';

export interface PamMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  context?: string;
  metadata?: Record<string, any>;
}

export interface PamVoiceOptions {
  enabled: boolean;
  fallbackToText: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  skipIfSpeaking: boolean;
}

export interface PamConnectionConfig {
  wsUrl: string;
  reconnectMaxAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  messageTimeout: number;
}

export interface PamServiceEvents {
  onMessage: (message: PamMessage) => void;
  onConnectionChange: (connected: boolean) => void;
  onVoiceStatusChange: (status: 'speaking' | 'idle' | 'error') => void;
  onError: (error: Error) => void;
}

// PAM Configuration - Enhanced from existing setup
export const PAM_CONFIG = {
  // Primary PAM WebSocket endpoints (production ready)
  WEBSOCKET_ENDPOINTS: [
    import.meta.env.VITE_WEBSOCKET_URL ? `${import.meta.env.VITE_WEBSOCKET_URL}/api/v1/pam/ws` :
    import.meta.env.VITE_PAM_WEBSOCKET_URL || 
    'wss://pam-backend.onrender.com/api/v1/pam/ws',
    'wss://api.wheelsandwins.com/pam/ws',  // Alternate production endpoint
  ],
  
  // Fallback HTTP endpoints for when WebSocket isn't available
  HTTP_ENDPOINTS: [
    `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com'  }/api/v1/pam/chat`,
    'https://api.wheelsandwins.com/pam/chat'
  ],
  
  // Connection settings
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000,
  HEARTBEAT_INTERVAL: 30000,
  MESSAGE_TIMEOUT: 30000
};

class PAMService {
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = PAM_CONFIG.RECONNECT_ATTEMPTS;
  private reconnectDelay = PAM_CONFIG.RECONNECT_DELAY;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private pendingMessages: Map<string, PamMessage> = new Map();
  private isConnecting = false;
  private currentUser: any = null;
  private events: Partial<PamServiceEvents> = {};
  private currentEndpointIndex = 0;

  // Configuration
  private config: PamConnectionConfig = {
    wsUrl: '',
    reconnectMaxAttempts: PAM_CONFIG.RECONNECT_ATTEMPTS,
    reconnectDelay: PAM_CONFIG.RECONNECT_DELAY,
    heartbeatInterval: PAM_CONFIG.HEARTBEAT_INTERVAL,
    messageTimeout: PAM_CONFIG.MESSAGE_TIMEOUT
  };

  // Voice integration
  private voiceOptions: PamVoiceOptions = {
    enabled: true,
    fallbackToText: true,
    priority: 'normal',
    skipIfSpeaking: false
  };

  constructor() {
    this.setupSupabaseAuth();
  }

  /**
   * Initialize PAM service with configuration
   */
  async initialize(config: Partial<PamConnectionConfig> = {}, events: Partial<PamServiceEvents> = {}): Promise<void> {
    console.log('🤖 Initializing PAM service...');
    
    this.config = { ...this.config, ...config };
    this.events = events;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    this.currentUser = user;

    if (!this.currentUser) {
      throw new Error('User not authenticated - PAM service requires authentication');
    }

    // Start connection
    await this.connect();
    
    console.log('✅ PAM service initialized successfully');
  }

  /**
   * Setup Supabase authentication listener
   */
  private setupSupabaseAuth(): void {
    supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser = session?.user || null;
      
      if (event === 'SIGNED_OUT') {
        this.disconnect();
      } else if (event === 'SIGNED_IN' && !this.isConnected()) {
        this.connect().catch(console.error);
      }
    });
  }

  /**
   * Connect to PAM WebSocket with authentication and fallback
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return;
    }

    if (!this.currentUser) {
      throw new Error('Cannot connect: User not authenticated');
    }

    this.isConnecting = true;

    // Try WebSocket endpoints first
    for (let i = 0; i < PAM_CONFIG.WEBSOCKET_ENDPOINTS.length; i++) {
      const endpoint = PAM_CONFIG.WEBSOCKET_ENDPOINTS[i];
      console.log(`🔄 Attempting PAM connection to ${endpoint}`);
      
      try {
        await this.attemptWebSocketConnection(endpoint);
        this.currentEndpointIndex = i;
        console.log(`✅ PAM connected to ${endpoint}`);
        this.events.onConnectionChange?.(true);
        this.startHeartbeat();
        this.isConnecting = false;
        return;
      } catch (error) {
        console.warn(`❌ Failed to connect to ${endpoint}:`, error);
        continue;
      }
    }
    
    // If all WebSocket endpoints fail, fall back to HTTP
    console.log('🔄 WebSocket failed, falling back to HTTP mode');
    this.setupHTTPFallback();
    this.isConnecting = false;
  }

  /**
   * Attempt WebSocket connection to specific endpoint
   */
  private async attemptWebSocketConnection(endpoint: string): Promise<void> {
    try {
      console.log('🔌 Connecting to PAM WebSocket...', endpoint);

      // Get JWT token for WebSocket authentication
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Create WebSocket connection with authentication
      // Backend expects user ID in path: /ws/{user_id}
      const userId = this.currentUser?.id || session?.user?.id;
      if (!userId) {
        throw new Error('User ID not available for WebSocket connection');
      }
      
      // Fix the endpoint to include user ID in the path
      let baseUrl = endpoint;
      if (endpoint.includes('/api/v1/pam/ws')) {
        // Replace /api/v1/pam/ws with /api/v1/pam/ws/{userId}
        baseUrl = endpoint.replace('/api/v1/pam/ws', `/api/v1/pam/ws/${userId}`);
      } else if (endpoint.includes('/pam/ws')) {
        // Handle alternate endpoint format
        baseUrl = endpoint.replace('/pam/ws', `/pam/ws/${userId}`);
      }
      
      const wsUrl = new URL(baseUrl);
      wsUrl.searchParams.append('token', token);
      wsUrl.searchParams.append('user_id', userId);
      wsUrl.searchParams.append('version', '1.0');

      // Return a promise that resolves when connection opens
      return new Promise((resolve, reject) => {
        this.wsConnection = new WebSocket(wsUrl.toString());

        const timeout = setTimeout(() => {
          this.wsConnection?.close();
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        // Setup event listeners
        this.wsConnection.onopen = () => {
          clearTimeout(timeout);
          console.log('🔗 PAM WebSocket connection opened');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.wsConnection.onmessage = this.handleWebSocketMessage.bind(this);
        this.wsConnection.onclose = this.handleWebSocketClose.bind(this);
        this.wsConnection.onerror = (event) => {
          clearTimeout(timeout);
          console.error('❌ PAM WebSocket error:', event);
          reject(new Error('WebSocket connection error'));
        };
      });

    } catch (error) {
      console.error('❌ PAM WebSocket connection setup failed:', error);
      throw error;
    }
  }

  /**
   * Setup HTTP fallback when WebSocket fails
   */
  private setupHTTPFallback(): void {
    console.log('🔄 Setting up HTTP fallback mode');
    // Simulate connected status for HTTP mode
    setTimeout(() => {
      this.events.onConnectionChange?.(true);
      console.log('📡 PAM HTTP fallback mode active');
    }, 1000);
  }

  /**
   * Handle WebSocket message received
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 PAM message received:', data);

      // Handle different message types
      switch (data.type) {
        case 'pam_response':
        case 'message':
          this.handlePamResponse(data);
          break;
        case 'heartbeat_response':
        case 'pong':
          // Heartbeat acknowledged
          break;
        case 'error':
          this.handleServerError(data);
          break;
        default:
          // Try to handle as generic message
          if (data.message || data.content) {
            this.handlePamResponse(data);
          } else {
            console.warn('Unknown PAM message type:', data.type);
          }
      }

    } catch (error) {
      console.error('❌ Failed to parse PAM message:', error);
      this.events.onError?.(error as Error);
    }
  }

  /**
   * Handle PAM response message
   */
  private async handlePamResponse(data: any): Promise<void> {
    const message: PamMessage = {
      id: data.id || `pam_${Date.now()}`,
      content: data.message || data.content,
      role: 'assistant',
      timestamp: data.timestamp || new Date().toISOString(),
      context: data.context,
      metadata: data.metadata
    };

    // Notify message received
    this.events.onMessage?.(message);

    // Handle voice synthesis if enabled
    if (this.voiceOptions.enabled && message.content) {
      await this.handleVoiceSynthesis(message);
    }

    // Clear message timeout if exists
    if (data.request_id && this.messageTimeouts.has(data.request_id)) {
      clearTimeout(this.messageTimeouts.get(data.request_id));
      this.messageTimeouts.delete(data.request_id);
    }
  }

  /**
   * Handle voice synthesis for PAM response
   */
  private async handleVoiceSynthesis(message: PamMessage): Promise<void> {
    try {
      // Skip if currently speaking and skipIfSpeaking is enabled
      const voiceStore = useVoiceStore.getState();
      if (this.voiceOptions.skipIfSpeaking && voiceStore.agentStatus === 'speaking') {
        console.log('🔇 Skipping voice synthesis - already speaking');
        return;
      }

      console.log('🎙️ Synthesizing PAM response...');
      this.events.onVoiceStatusChange?.('speaking');

      // Use voice orchestrator for synthesis
      await voiceOrchestrator.speak(message.content, {
        priority: this.voiceOptions.priority,
        fallbackToText: this.voiceOptions.fallbackToText,
        chunkId: message.id
      });

      console.log('✅ PAM voice synthesis completed');
      this.events.onVoiceStatusChange?.('idle');

    } catch (error) {
      console.error('❌ PAM voice synthesis failed:', error);
      this.events.onVoiceStatusChange?.('error');
      
      // Use error recovery if available
      if (this.voiceOptions.fallbackToText) {
        console.log('📝 Falling back to text display');
        // Text fallback would be handled by the UI component
      }
    }
  }

  /**
   * Handle server error message
   */
  private handleServerError(data: any): void {
    const error = new Error(data.message || 'PAM server error');
    console.error('🚨 PAM server error:', data);
    this.events.onError?.(error);
  }

  /**
   * Handle WebSocket connection closed
   */
  private handleWebSocketClose(event: CloseEvent): void {
    console.log('🔌 PAM WebSocket connection closed:', event.code, event.reason);
    
    this.stopHeartbeat();
    this.events.onConnectionChange?.(false);
    
    // Attempt reconnection if not a clean close
    if (event.code !== 1000) {
      this.scheduleReconnection();
    }
  }

  /**
   * Send message to PAM
   */
  async sendMessage(content: string, context?: string): Promise<string> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const message: PamMessage = {
      id: messageId,
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
      context
    };

    if (!this.isConnected()) {
      console.log('📝 PAM not connected, queuing message...');
      this.pendingMessages.set(messageId, message);
      
      // Attempt to reconnect
      this.connect().catch(console.error);
      
      return messageId;
    }

    try {
      const payload = {
        type: 'user_message',
        id: messageId,
        message: content,
        content, // Support both formats
        context,
        user_id: this.currentUser?.id,
        timestamp: message.timestamp
      };

      const success = await this.sendWebSocketOrHTTP(payload);
      
      if (success) {
        console.log('📤 PAM message sent:', payload);

        // Set timeout for response
        const timeout = setTimeout(() => {
          this.messageTimeouts.delete(messageId);
          console.warn('⏱️ PAM response timeout for message:', messageId);
        }, this.config.messageTimeout);

        this.messageTimeouts.set(messageId, timeout);
      } else {
        // Queue message for retry
        this.pendingMessages.set(messageId, message);
      }
      
      return messageId;

    } catch (error) {
      console.error('❌ Failed to send PAM message:', error);
      
      // Queue message for retry
      this.pendingMessages.set(messageId, message);
      this.events.onError?.(error as Error);
      
      throw error;
    }
  }

  /**
   * Send message via WebSocket or HTTP fallback
   */
  private async sendWebSocketOrHTTP(payload: any): Promise<boolean> {
    // Try WebSocket first
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      try {
        this.wsConnection.send(JSON.stringify(payload));
        return true;
      } catch (error) {
        console.warn('❌ WebSocket send failed, trying HTTP fallback:', error);
      }
    }
    
    // Fallback to HTTP
    return this.sendHTTPMessage(payload);
  }

  /**
   * Send message via HTTP fallback
   */
  private async sendHTTPMessage(payload: any): Promise<boolean> {
    for (const endpoint of PAM_CONFIG.HTTP_ENDPOINTS) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const data = await response.json();
          // Simulate WebSocket message format
          setTimeout(() => this.handlePamResponse(data), 100);
          return true;
        }
      } catch (error) {
        console.warn(`❌ HTTP fallback failed for ${endpoint}:`, error);
      }
    }
    return false;
  }

  /**
   * Send pending messages
   */
  private async sendPendingMessages(): Promise<void> {
    if (this.pendingMessages.size === 0) return;

    console.log(`📮 Sending ${this.pendingMessages.size} pending PAM messages...`);

    for (const [messageId, message] of this.pendingMessages) {
      try {
        await this.sendMessage(message.content, message.context);
        this.pendingMessages.delete(messageId);
      } catch (error) {
        console.error('❌ Failed to send pending message:', messageId, error);
        // Keep in pending for next attempt
      }
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(() => {
      if (this.wsConnection?.readyState === WebSocket.OPEN) {
        try {
          this.wsConnection.send(JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error('❌ Heartbeat failed:', error);
          this.stopHeartbeat();
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnection(): void {
    if (this.reconnectAttempts >= this.config.reconnectMaxAttempts) {
      console.error('🚫 Max PAM reconnection attempts reached, switching to HTTP mode');
      this.setupHTTPFallback();
      return;
    }

    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    const totalDelay = delay + jitter;

    console.log(`🔄 PAM reconnection attempt ${this.reconnectAttempts + 1} in ${Math.round(totalDelay)}ms...`);
    
    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ PAM reconnection failed:', error);
        this.scheduleReconnection();
      });
    }, totalDelay);
  }

  /**
   * Update voice options
   */
  setVoiceOptions(options: Partial<PamVoiceOptions>): void {
    this.voiceOptions = { ...this.voiceOptions, ...options };
    console.log('🎙️ PAM voice options updated:', this.voiceOptions);
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.wsConnection?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    pendingMessages: number;
    voiceEnabled: boolean;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      pendingMessages: this.pendingMessages.size,
      voiceEnabled: this.voiceOptions.enabled
    };
  }

  /**
   * Interrupt current voice synthesis
   */
  interruptVoice(): void {
    try {
      voiceOrchestrator.interrupt();
      this.events.onVoiceStatusChange?.('idle');
      console.log('⏹️ PAM voice synthesis interrupted');
    } catch (error) {
      console.error('❌ Failed to interrupt PAM voice:', error);
    }
  }

  /**
   * Disconnect from PAM service
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from PAM service...');
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Clear timeouts
    this.messageTimeouts.forEach(timeout => clearTimeout(timeout));
    this.messageTimeouts.clear();
    
    // Close WebSocket connection
    if (this.wsConnection) {
      this.wsConnection.close(1000, 'Client disconnect');
      this.wsConnection = null;
    }
    
    // Interrupt any ongoing voice synthesis
    this.interruptVoice();
    
    // Reset state
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Notify disconnection
    this.events.onConnectionChange?.(false);
    
    console.log('✅ PAM service disconnected');
  }

  /**
   * Destroy PAM service and cleanup resources
   */
  destroy(): void {
    console.log('🧹 Destroying PAM service...');
    
    this.disconnect();
    
    // Clear pending messages
    this.pendingMessages.clear();
    
    // Clear events
    this.events = {};
    
    console.log('✅ PAM service destroyed');
  }
}

// Export singleton instance
export const pamService = new PAMService();

// Legacy WebSocket service for backward compatibility
export class PAMWebSocketService {
  private pamService = pamService;
  
  constructor(
    private onMessage: (message: any) => void,
    private onStatusChange: (connected: boolean) => void
  ) {
    // Initialize with legacy callbacks
    this.pamService.initialize({}, {
      onMessage: this.onMessage,
      onConnectionChange: this.onStatusChange
    });
  }

  async connect(userId: string): Promise<boolean> {
    try {
      await this.pamService.connect();
      return true;
    } catch (error) {
      console.error('Legacy connect failed:', error);
      return false;
    }
  }

  async sendMessage(message: any): Promise<boolean> {
    try {
      const content = message.message || message.content || message;
      await this.pamService.sendMessage(content, message.context);
      return true;
    } catch (error) {
      console.error('Legacy sendMessage failed:', error);
      return false;
    }
  }

  disconnect(): void {
    this.pamService.disconnect();
  }
}

// Export types
export type {
  PamMessage,
  PamVoiceOptions,
  PamConnectionConfig,
  PamServiceEvents
};