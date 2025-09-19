/**
 * Enhanced caching service for performance optimization
 * Implements multiple caching layers: Memory, SessionStorage, and intelligent prefetching
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  enableCompression?: boolean;
  enablePersistence?: boolean; // Use sessionStorage
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 1000;
  private compressionEnabled = true;
  private persistenceEnabled = true;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl ?? this.defaultTTL;
    this.maxSize = options.maxSize ?? this.maxSize;
    this.compressionEnabled = options.enableCompression ?? true;
    this.persistenceEnabled = options.enablePersistence ?? true;

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Set cache entry with optional TTL override
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      hits: 0
    };

    // Remove oldest entry if at capacity
    if (this.memoryCache.size >= this.maxSize) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(key, entry);

    // Persist to sessionStorage if enabled
    if (this.persistenceEnabled && typeof sessionStorage !== 'undefined') {
      try {
        const serialized = this.compressionEnabled
          ? this.compress(JSON.stringify(entry))
          : JSON.stringify(entry);
        sessionStorage.setItem(`cache_${key}`, serialized);
      } catch (error) {
        console.warn('Failed to persist cache entry:', error);
      }
    }
  }

  /**
   * Get cache entry with hit tracking
   */
  get<T>(key: string): T | null {
    let entry = this.memoryCache.get(key);

    // Try to load from sessionStorage if not in memory
    if (!entry && this.persistenceEnabled && typeof sessionStorage !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(`cache_${key}`);
        if (stored) {
          const serialized = this.compressionEnabled
            ? this.decompress(stored)
            : stored;
          entry = JSON.parse(serialized);

          // Restore to memory cache
          if (entry) {
            this.memoryCache.set(key, entry);
          }
        }
      } catch (error) {
        console.warn('Failed to load from persistent cache:', error);
      }
    }

    if (!entry) return null;

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      return null;
    }

    // Update hit counter and access time
    entry.hits++;
    entry.timestamp = Date.now();

    return entry.data;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key);

    if (this.persistenceEnabled && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(`cache_${key}`);
    }

    return deleted;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear();

    if (this.persistenceEnabled && typeof sessionStorage !== 'undefined') {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.memoryCache.entries());
    const totalHits = entries.reduce((sum, [, entry]) => sum + entry.hits, 0);
    const avgHits = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.memoryCache.size,
      maxSize: this.maxSize,
      totalHits,
      avgHits: Math.round(avgHits * 100) / 100,
      hitRate: entries.length > 0 ? (totalHits / entries.length) * 100 : 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Advanced caching wrapper with intelligent prefetching
   */
  async cached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: { ttl?: number; prefetch?: boolean } = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      // Prefetch in background if cache is getting old
      if (options.prefetch && this.shouldPrefetch(key)) {
        this.prefetchInBackground(key, fetchFn, options);
      }
      return cached;
    }

    // Cache miss - fetch data
    try {
      const data = await fetchFn();
      this.set(key, data, options.ttl);
      return data;
    } catch (error) {
      console.error(`Cache fetch failed for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Batch cache operations for efficiency
   */
  setBatch<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  getBatch<T>(keys: string[]): Array<{ key: string; data: T | null }> {
    return keys.map(key => ({
      key,
      data: this.get<T>(key)
    }));
  }

  // Private helper methods

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private getOldestKey(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));

    console.debug(`Cache cleanup: removed ${keysToDelete.length} expired entries`);
  }

  private shouldPrefetch(key: string): boolean {
    const entry = this.memoryCache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    const ttlRemaining = entry.ttl - age;

    // Prefetch if less than 20% of TTL remaining
    return ttlRemaining < (entry.ttl * 0.2);
  }

  private async prefetchInBackground<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: { ttl?: number }
  ): Promise<void> {
    try {
      console.debug(`Background prefetch started for: ${key}`);
      const data = await fetchFn();
      this.set(key, data, options.ttl);
      console.debug(`Background prefetch completed for: ${key}`);
    } catch (error) {
      console.warn(`Background prefetch failed for: ${key}`, error);
    }
  }

  private compress(data: string): string {
    // Simple compression placeholder - in production, use a real compression library
    return btoa(data);
  }

  private decompress(data: string): string {
    return atob(data);
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      totalSize += key.length * 2; // chars are 2 bytes
      totalSize += JSON.stringify(entry.data).length * 2;
      totalSize += 64; // overhead for entry metadata
    }

    return Math.round(totalSize / 1024); // Return in KB
  }
}

// Create singleton instances for different cache types
export const apiCache = new CacheService({
  ttl: 2 * 60 * 1000, // 2 minutes for API responses
  maxSize: 500,
  enablePersistence: true
});

export const userDataCache = new CacheService({
  ttl: 10 * 60 * 1000, // 10 minutes for user data
  maxSize: 200,
  enablePersistence: true
});

export const staticDataCache = new CacheService({
  ttl: 60 * 60 * 1000, // 1 hour for static data
  maxSize: 100,
  enablePersistence: true
});

export const tripTemplateCache = new CacheService({
  ttl: 30 * 60 * 1000, // 30 minutes for trip templates
  maxSize: 300,
  enablePersistence: true
});

// Export the main cache service class
export { CacheService };
export default apiCache;