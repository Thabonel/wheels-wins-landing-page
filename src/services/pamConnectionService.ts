/**
 * PAM Connection Service
 * Handles backend connection with retry logic and fallback
 */

import { logger } from '@/lib/logger';

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  lastError?: string;
  retryCount: number;
  backend: 'primary' | 'fallback' | 'offline';
}

class PamConnectionService {
  private status: ConnectionStatus = {
    isConnected: false,
    isConnecting: false,
    retryCount: 0,
    backend: 'primary'
  };

  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  private healthCheckInterval?: NodeJS.Timeout;
  private retryTimeout?: NodeJS.Timeout;

  // Backend URLs in priority order - Updated to prioritize working staging server
  private backends = [
    'https://wheels-wins-backend-staging.onrender.com',
    import.meta.env.VITE_BACKEND_URL,
    import.meta.env.VITE_API_URL,
    'https://pam-backend.onrender.com'  // Moved to last - has event loop issues
  ].filter(Boolean);

  private currentBackendIndex = 0;

  get currentBackend() {
    return this.backends[this.currentBackendIndex] || this.backends[0];
  }

  /**
   * Initialize connection with retry logic
   */
  async connect(): Promise<boolean> {
    if (this.status.isConnecting) {
      logger.debug('Already connecting to PAM backend...');
      return false;
    }

    this.updateStatus({ isConnecting: true });
    logger.info('🔌 Connecting to PAM backend...');

    // Try each backend in order
    for (let i = 0; i < this.backends.length; i++) {
      this.currentBackendIndex = i;
      const backend = this.backends[i];
      
      if (!backend) continue;
      
      logger.debug(`Trying backend ${i + 1}/${this.backends.length}: ${backend}`);
      
      const isHealthy = await this.checkHealth(backend);
      if (isHealthy) {
        logger.info(`✅ Connected to PAM backend: ${backend}`);
        this.updateStatus({
          isConnected: true,
          isConnecting: false,
          retryCount: 0,
          backend: i === 0 ? 'primary' : 'fallback',
          lastError: undefined
        });
        
        // Start health monitoring
        this.startHealthMonitoring();
        return true;
      }
    }

    // All backends failed
    logger.error('❌ All PAM backends are unreachable');
    this.updateStatus({
      isConnected: false,
      isConnecting: false,
      backend: 'offline',
      lastError: 'Cannot connect to any PAM backend'
    });

    // Schedule retry
    this.scheduleRetry();
    return false;
  }

  /**
   * Check health of a specific backend
   */
  private async checkHealth(backendUrl: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        logger.debug('Backend health check passed:', data);
        return true;
      }

      logger.warn(`Backend health check failed with status: ${response.status}`);
      return false;
    } catch (error: any) {
      // Check if it's a CORS error (typically happens with fetch)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        logger.warn(`Backend may be sleeping or has CORS issues: ${backendUrl}`);
        
        // Try to wake it up with a simple request
        try {
          await fetch(backendUrl, { 
            method: 'HEAD',
            mode: 'no-cors' // This won't give us the response but will wake the server
          });
          logger.debug('Sent wake-up request to backend');
          
          // Wait a bit for server to wake up
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try health check again
          const retryResponse = await fetch(`${backendUrl}/health`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          
          return retryResponse.ok;
        } catch {
          // Silent fail on wake-up attempt
        }
      }
      
      logger.debug(`Health check failed for ${backendUrl}:`, error.message);
      return false;
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring() {
    this.stopHealthMonitoring();
    
    this.healthCheckInterval = setInterval(async () => {
      if (!this.status.isConnected) return;
      
      const isHealthy = await this.checkHealth(this.currentBackend);
      if (!isHealthy) {
        logger.warn('Lost connection to PAM backend');
        this.updateStatus({
          isConnected: false,
          lastError: 'Lost connection to backend'
        });
        this.connect(); // Try to reconnect
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Schedule a retry attempt
   */
  private scheduleRetry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    const retryDelay = Math.min(5000 * Math.pow(2, this.status.retryCount), 60000); // Max 1 minute
    logger.debug(`Scheduling retry in ${retryDelay / 1000} seconds...`);

    this.retryTimeout = setTimeout(() => {
      this.updateStatus({ retryCount: this.status.retryCount + 1 });
      this.connect();
    }, retryDelay);
  }

  /**
   * Update connection status and notify listeners
   */
  private updateStatus(updates: Partial<ConnectionStatus>) {
    this.status = { ...this.status, ...updates };
    this.notifyListeners();
  }

  /**
   * Subscribe to connection status changes
   */
  subscribe(listener: (status: ConnectionStatus) => void) {
    this.listeners.add(listener);
    // Immediately notify of current status
    listener(this.status);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.status));
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.stopHealthMonitoring();
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = undefined;
    }
    this.updateStatus({
      isConnected: false,
      isConnecting: false,
      backend: 'offline'
    });
  }

  /**
   * Get the current backend URL with WebSocket protocol
   */
  getWebSocketUrl(): string {
    return this.currentBackend.replace(/^http/, 'ws');
  }
}

// Singleton instance
export const pamConnectionService = new PamConnectionService();