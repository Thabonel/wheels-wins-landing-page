// PAM Service Configuration - Permanent Setup
export const PAM_CONFIG = {
  // Primary PAM WebSocket endpoints (production ready)
  WEBSOCKET_ENDPOINTS: [
    import.meta.env.VITE_PAM_WEBSOCKET_URL || 'wss://pam-backend.onrender.com/ws',
    'wss://api.wheelsandwins.com/pam/ws',  // Alternate production endpoint
    'wss://treflip2025.app.n8n.cloud/ws/pam' // N8N WebSocket proxy
  ],
  
  // Fallback HTTP endpoints for when WebSocket isn't available
  HTTP_ENDPOINTS: [
    'https://treflip2025.app.n8n.cloud/webhook/4cd18979-6ee8-451e-b4e6-095c3d7ca31a',
    'https://api.wheelsandwins.com/pam/chat'
  ],
  
  // Connection settings
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000,
  HEARTBEAT_INTERVAL: 30000
};

export class PAMWebSocketService {
  private ws: WebSocket | null = null;
  private currentEndpointIndex = 0;
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor(
    private onMessage: (message: any) => void,
    private onStatusChange: (connected: boolean) => void
  ) {}

  async connect(userId: string) {
    this.cleanup();
    
    for (let i = 0; i < PAM_CONFIG.WEBSOCKET_ENDPOINTS.length; i++) {
      const endpoint = PAM_CONFIG.WEBSOCKET_ENDPOINTS[i];
      console.log(`🔄 Attempting PAM connection to ${endpoint}`);
      
      try {
        await this.attemptConnection(endpoint, userId);
        this.currentEndpointIndex = i;
        console.log(`✅ PAM connected to ${endpoint}`);
        this.onStatusChange(true);
        this.startHeartbeat();
        return true;
      } catch (error) {
        console.warn(`❌ Failed to connect to ${endpoint}:`, error);
        continue;
      }
    }
    
    // If all WebSocket endpoints fail, fall back to HTTP
    console.log('🔄 WebSocket failed, falling back to HTTP mode');
    this.setupHTTPFallback();
    return false;
  }

  private attemptConnection(endpoint: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${endpoint}?userId=${userId}&version=1.0`;
      this.ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        this.ws?.close();
        reject(new Error('Connection timeout'));
      }, 5000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        console.log('🎯 PAM WebSocket opened');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 PAM message received:', message);
          this.onMessage(message);
        } catch (error) {
          console.error('❌ Failed to parse PAM message:', error);
        }
      };

      this.ws.onclose = () => {
        clearTimeout(timeout);
        console.log('🔌 PAM WebSocket closed');
        this.onStatusChange(false);
        this.scheduleReconnect(userId);
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('❌ PAM WebSocket error:', error);
        reject(error);
      };
    });
  }

  private setupHTTPFallback() {
    console.log('🔄 Setting up HTTP fallback mode');
    // Simulate connected status for HTTP mode
    setTimeout(() => {
      this.onStatusChange(true);
      console.log('📡 PAM HTTP fallback mode active');
    }, 1000);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, PAM_CONFIG.HEARTBEAT_INTERVAL);
  }

  private scheduleReconnect(userId: string) {
    if (this.reconnectAttempts < PAM_CONFIG.RECONNECT_ATTEMPTS) {
      const delay = PAM_CONFIG.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
      console.log(`�� Scheduling PAM reconnect in ${delay}ms`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(userId);
      }, delay);
    } else {
      console.log('❌ Max PAM reconnect attempts reached, switching to HTTP mode');
      this.setupHTTPFallback();
    }
  }

  async sendMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    } else {
      // Fall back to HTTP
      return this.sendHTTPMessage(message);
    }
  }

  private async sendHTTPMessage(message: any) {
    for (const endpoint of PAM_CONFIG.HTTP_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        if (response.ok) {
          const data = await response.json();
          // Simulate WebSocket message format
          this.onMessage(data);
          return true;
        }
      } catch (error) {
        console.warn(`❌ HTTP fallback failed for ${endpoint}:`, error);
      }
    }
    return false;
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  disconnect() {
    this.cleanup();
    this.onStatusChange(false);
  }
}
