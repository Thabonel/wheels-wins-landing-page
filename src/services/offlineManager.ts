// Offline Capabilities Manager
export interface OfflineQueueItem {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
  priority: 'low' | 'medium' | 'high';
}

export interface CacheConfig {
  maxSize: number; // bytes
  maxAge: number; // milliseconds
  storageKey: string;
}

export interface OfflineCapabilities {
  cache: boolean;
  queue: boolean;
  sync: boolean;
  compression: boolean;
}

export class OfflineManager {
  private static instance: OfflineManager;
  private queue: OfflineQueueItem[] = [];
  private cache = new Map<string, { data: any; timestamp: number; size: number }>();
  private totalCacheSize = 0;
  private config: CacheConfig;
  private isOnline = navigator.onLine;

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 10 * 1024 * 1024, // 10MB default
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      storageKey: 'pam_offline_cache',
      ...config
    };

    this.initializeOfflineHandlers();
    this.loadPersistedData();
  }

  static getInstance(config?: Partial<CacheConfig>): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager(config);
    }
    return OfflineManager.instance;
  }

  private initializeOfflineHandlers() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Process queue periodically when online
    setInterval(() => {
      if (this.isOnline && this.queue.length > 0) {
        this.processQueue();
      }
    }, 30000); // Every 30 seconds
  }

  // Cache Management
  setCache(key: string, data: any, compress: boolean = true): void {
    try {
      const serialized = JSON.stringify(data);
      const size = new Blob([serialized]).size;

      // Check cache size limits
      if (size > this.config.maxSize * 0.1) { // Don't cache items > 10% of total
        console.warn(`Item too large for cache: ${size} bytes`);
        return;
      }

      // Evict old entries if needed
      this.evictIfNeeded(size);

      this.cache.set(key, {
        data: compress ? this.compressData(data) : data,
        timestamp: Date.now(),
        size
      });

      this.totalCacheSize += size;
      this.persistCache();
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  getCache(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.config.maxAge) {
      this.cache.delete(key);
      this.totalCacheSize -= entry.size;
      return null;
    }

    return this.decompressData(entry.data);
  }

  // Queue Management for offline operations
  addToQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): void {
    const queueItem: OfflineQueueItem = {
      ...item,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(queueItem);
    this.persistQueue();

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) return;

    // Sort by priority and timestamp
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });

    const batchSize = 3; // Process 3 items at a time
    const batch = this.queue.splice(0, batchSize);

    for (const item of batch) {
      try {
        await this.executeQueueItem(item);
        console.log(`✅ Processed offline queue item: ${item.id}`);
      } catch (error) {
        console.error(`❌ Failed to process queue item: ${item.id}`, error);
        
        item.retryCount++;
        if (item.retryCount < 3) {
          // Re-add to queue with exponential backoff
          setTimeout(() => {
            this.queue.push(item);
            this.persistQueue();
          }, Math.pow(2, item.retryCount) * 1000);
        }
      }
    }

    this.persistQueue();
  }

  private async executeQueueItem(item: OfflineQueueItem): Promise<void> {
    const response = await fetch(item.endpoint, {
      method: item.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: item.data ? JSON.stringify(item.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  // Core Functions Cache (Essential PAM functions)
  getCoreFunction(functionName: string): any | null {
    return this.getCache(`core_function_${functionName}`);
  }

  setCoreFunction(functionName: string, data: any): void {
    this.setCache(`core_function_${functionName}`, data, true);
  }

  // Mobile-optimized API wrapper
  async apiCall(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheDuration?: number
  ): Promise<any> {
    // Try cache first if available
    if (cacheKey && this.isOnline) {
      const cached = this.getCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // If offline, check cache or add to queue
    if (!this.isOnline) {
      if (cacheKey) {
        const cached = this.getCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Add to queue for later processing
      if (options.method !== 'GET') {
        this.addToQueue({
          endpoint,
          method: (options.method as any) || 'GET',
          data: options.body ? JSON.parse(options.body as string) : undefined,
          priority: 'medium'
        });
      }

      throw new Error('Offline: Request queued for later processing');
    }

    // Make the actual request
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Cache successful GET requests
    if (cacheKey && (!options.method || options.method === 'GET')) {
      this.setCache(cacheKey, data);
    }

    return data;
  }

  // Utility methods
  private evictIfNeeded(newItemSize: number): void {
    while (this.totalCacheSize + newItemSize > this.config.maxSize) {
      // Find oldest entry
      let oldestKey = '';
      let oldestTime = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        const entry = this.cache.get(oldestKey)!;
        this.cache.delete(oldestKey);
        this.totalCacheSize -= entry.size;
      } else {
        break; // No more items to evict
      }
    }
  }

  private compressData(data: any): any {
    // Simple compression by removing whitespace and common fields
    if (typeof data === 'object' && data !== null) {
      const compressed = { ...data };
      delete compressed.debug_info;
      delete compressed.metadata;
      return compressed;
    }
    return data;
  }

  private decompressData(data: any): any {
    return data; // In real implementation, reverse compression
  }

  private persistCache(): void {
    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem(`${this.config.storageKey}_cache`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to persist cache:', error);
    }
  }

  private persistQueue(): void {
    try {
      localStorage.setItem(`${this.config.storageKey}_queue`, JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to persist queue:', error);
    }
  }

  private loadPersistedData(): void {
    try {
      // Load cache
      const cacheData = localStorage.getItem(`${this.config.storageKey}_cache`);
      if (cacheData) {
        const entries = JSON.parse(cacheData);
        this.cache = new Map(entries);
        this.totalCacheSize = Array.from(this.cache.values())
          .reduce((total, entry) => total + entry.size, 0);
      }

      // Load queue
      const queueData = localStorage.getItem(`${this.config.storageKey}_queue`);
      if (queueData) {
        this.queue = JSON.parse(queueData);
      }
    } catch (error) {
      console.warn('Failed to load persisted data:', error);
    }
  }

  // Public getters
  get isOffline(): boolean {
    return !this.isOnline;
  }

  get queueSize(): number {
    return this.queue.length;
  }

  get cacheSize(): number {
    return this.totalCacheSize;
  }

  get cacheStats(): { entries: number; size: number; maxSize: number } {
    return {
      entries: this.cache.size,
      size: this.totalCacheSize,
      maxSize: this.config.maxSize
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.totalCacheSize = 0;
    localStorage.removeItem(`${this.config.storageKey}_cache`);
  }

  clearQueue(): void {
    this.queue = [];
    localStorage.removeItem(`${this.config.storageKey}_queue`);
  }
}

export const offlineManager = OfflineManager.getInstance();