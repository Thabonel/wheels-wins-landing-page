import { offlineManager } from './offlineManager';
import { MobileOptimizer } from './mobileOptimizer';
import { API_BASE_URL } from './api';

export interface OptimizedPamApiMessage {
  message: string;
  user_id: string;
  context?: {
    region?: string;
    current_page?: string;
    session_data?: any;
    mobile_optimized?: boolean;
    compression_enabled?: boolean;
    connection_type?: string;
    viewport_size?: string;
  };
}

export interface OptimizedPamApiResponse {
  response?: string;
  message?: string;
  content?: string;
  error?: string;
  metadata?: {
    compressed: boolean;
    size: number;
    cached: boolean;
  };
}

export class OptimizedPamApiService {
  private static instance: OptimizedPamApiService;
  private isMobile: boolean;
  
  private constructor() {
    this.isMobile = window.innerWidth <= 768;
    
    // Listen for network changes
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 768;
    });
  }
  
  public static getInstance(): OptimizedPamApiService {
    if (!OptimizedPamApiService.instance) {
      OptimizedPamApiService.instance = new OptimizedPamApiService();
    }
    return OptimizedPamApiService.instance;
  }

  async sendMessage(
    message: OptimizedPamApiMessage, 
    token?: string,
    options: {
      enableOffline?: boolean;
      enableCompression?: boolean;
      priority?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<OptimizedPamApiResponse> {
    const {
      enableOffline = true,
      enableCompression = true,
      priority = 'medium'
    } = options;

    // Enhance message context for mobile
    const enhancedMessage: OptimizedPamApiMessage = {
      ...message,
      context: {
        ...message.context,
        mobile_optimized: this.isMobile,
        compression_enabled: enableCompression,
        connection_type: this.getConnectionType(),
        viewport_size: `${window.innerWidth}x${window.innerHeight}`
      }
    };

    const cacheKey = `pam_message_${this.hashMessage(message.message)}`;
    
    // Try cache first for repeated messages
    if (enableOffline) {
      const cached = offlineManager.getCache(cacheKey);
      if (cached) {
        return {
          ...cached,
          metadata: { ...cached.metadata, cached: true }
        };
      }
    }

    const endpoints = [
      `${API_BASE_URL}/api/chat`,
      'https://treflip2025.app.n8n.cloud/webhook/4cd18979-6ee8-451e-b4e6-095c3d7ca31a'
    ];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Mobile-Client': this.isMobile ? 'true' : 'false',
      'X-Compression-Enabled': enableCompression ? 'true' : 'false',
      'X-Request-Priority': priority,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Estimate payload size
    const payloadSize = new Blob([JSON.stringify(enhancedMessage)]).size;
    const dataUsage = MobileOptimizer.estimateDataUsage(enhancedMessage);
    
    console.log(`📱 PAM API call - Size: ${Math.round(payloadSize/1024)}KB, Impact: ${dataUsage.impact}`);

    // If offline, queue the request
    if (offlineManager.isOffline && enableOffline) {
      offlineManager.addToQueue({
        endpoint: endpoints[0],
        method: 'POST',
        data: enhancedMessage,
        priority
      });
      
      return {
        error: 'Request queued for when online',
        metadata: {
          compressed: false,
          size: payloadSize,
          cached: false
        }
      };
    }

    for (const endpoint of endpoints) {
      try {
        console.log(`🌐 Trying optimized PAM endpoint: ${endpoint}`);
        
        const timeoutMs = this.isMobile ? 20000 : 15000; // Longer timeout for mobile
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(enhancedMessage),
          signal: AbortSignal.timeout(timeoutMs)
        });

        if (response.ok) {
          let data = await response.json();
          
          // Apply mobile optimizations to response
          if (this.isMobile && enableCompression) {
            const optimized = MobileOptimizer.compressPayload(data, {
              enabled: true,
              threshold: 15 * 1024, // 15KB
              algorithm: 'gzip'
            });
            data = optimized.data;
          }

          const result: OptimizedPamApiResponse = {
            ...data,
            metadata: {
              compressed: enableCompression && this.isMobile,
              size: new Blob([JSON.stringify(data)]).size,
              cached: false
            }
          };

          // Cache successful responses
          if (enableOffline) {
            offlineManager.setCache(cacheKey, result);
          }

          console.log(`✅ Optimized PAM response from ${endpoint}:`, result.metadata);
          return result;
        } else {
          console.warn(`❌ PAM endpoint ${endpoint} returned status ${response.status}`);
        }
      } catch (error) {
        console.warn(`❌ PAM endpoint ${endpoint} failed:`, error);
        continue;
      }
    }

    // If all endpoints fail, try to get cached response
    if (enableOffline) {
      const cached = offlineManager.getCache(cacheKey);
      if (cached) {
        return {
          ...cached,
          error: 'Network failed, showing cached response',
          metadata: { ...cached.metadata, cached: true }
        };
      }
    }

    throw new Error('All PAM endpoints failed and no cached data available');
  }

  async testConnection(): Promise<{ 
    online: boolean; 
    latency?: number; 
    endpoint?: string;
    mobile: boolean;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await this.sendMessage({
        message: 'ping',
        user_id: 'health-check'
      }, undefined, { 
        enableOffline: false,
        priority: 'high' 
      });
      
      const latency = Date.now() - startTime;
      
      return {
        online: !response.error,
        latency,
        endpoint: response.error ? undefined : 'primary',
        mobile: this.isMobile
      };
    } catch (error) {
      console.error('❌ Optimized PAM health check failed:', error);
      return {
        online: false,
        mobile: this.isMobile
      };
    }
  }

  // Progressive loading for chat history
  async loadChatHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    messages: any[];
    hasMore: boolean;
    totalSize: number;
  }> {
    const mobileLimit = this.isMobile ? Math.min(limit, 10) : limit;
    const cacheKey = `chat_history_${userId}_${page}_${mobileLimit}`;
    
    try {
      const cached = offlineManager.getCache(cacheKey);
      if (cached && !offlineManager.isOffline) {
        return cached;
      }

      const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Mobile-Client': this.isMobile ? 'true' : 'false',
        },
        body: JSON.stringify({
          user_id: userId,
          page,
          limit: mobileLimit,
          mobile_optimized: this.isMobile
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      let data = await response.json();
      
      // Apply mobile optimizations
      if (this.isMobile) {
        data.messages = data.messages.map((msg: any) => 
          MobileOptimizer.selectiveFields(msg, ['id', 'content', 'timestamp', 'role'], true)
        );
      }

      const result = {
        messages: data.messages || [],
        hasMore: data.hasMore || false,
        totalSize: new Blob([JSON.stringify(data)]).size
      };

      offlineManager.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error('Failed to load chat history:', error);
      
      // Fallback to cache
      const cached = offlineManager.getCache(cacheKey);
      if (cached) {
        return cached;
      }
      
      throw error;
    }
  }

  private getConnectionType(): string {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      return conn.effectiveType || conn.type || 'unknown';
    }
    return 'unknown';
  }

  private hashMessage(message: string): string {
    // Simple hash for caching
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }

  get mobileStatus() {
    return {
      isMobile: this.isMobile,
      connectionType: this.getConnectionType(),
      isOffline: offlineManager.isOffline,
      queueSize: offlineManager.queueSize,
      cacheSize: offlineManager.cacheSize
    };
  }
}

export const optimizedPamApiService = OptimizedPamApiService.getInstance();