/**
 * Safe Caching Manager
 * Implements caching strategies that avoid trip planner functionality
 */

import React from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  enableCompression: boolean;
}

class SafeCacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;

  // Safe cache prefixes (avoiding trip planner related data)
  private readonly SAFE_PREFIXES = [
    'admin_',
    'user_profile_',
    'financial_',
    'social_',
    'pam_',
    'settings_',
    'auth_',
    'analytics_'
  ];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      enableCompression: true,
      ...config
    };

    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  private isSafeKey(key: string): boolean {
    // Ensure we don't cache anything related to trip planning
    const tripPlannerKeys = ['route_', 'map_', 'trip_', 'waypoint_', 'navigation_', 'location_'];

    if (tripPlannerKeys.some(prefix => key.startsWith(prefix))) {
      console.warn(`🚫 Cache blocked for trip planner key: ${key}`);
      return false;
    }

    return this.SAFE_PREFIXES.some(prefix => key.startsWith(prefix));
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private compress(data: any): string {
    // Simple compression for large objects
    if (this.config.enableCompression && typeof data === 'object') {
      return JSON.stringify(data);
    }
    return data;
  }

  private decompress(data: string): any {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  public set<T>(key: string, data: T, ttl?: number): boolean {
    if (!this.isSafeKey(key)) {
      return false;
    }

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    const entry: CacheEntry<T> = {
      data: this.compress(data),
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      key
    };

    this.cache.set(key, entry);
    console.log(`📦 Cached: ${key} (TTL: ${entry.ttl}ms)`);
    return true;
  }

  public get<T>(key: string): T | null {
    if (!this.isSafeKey(key)) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      console.log(`⏰ Cache expired: ${key}`);
      return null;
    }

    console.log(`✅ Cache hit: ${key}`);
    return this.decompress(entry.data);
  }

  public has(key: string): boolean {
    if (!this.isSafeKey(key)) {
      return false;
    }

    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  public delete(key: string): boolean {
    if (!this.isSafeKey(key)) {
      return false;
    }

    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ Cache deleted: ${key}`);
    }
    return deleted;
  }

  public clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cache cleared: ${size} entries removed`);
  }

  public cleanup(): void {
    const initialSize = this.cache.size;
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧽 Cache cleanup: ${cleanedCount}/${initialSize} expired entries removed`);
    }
  }

  public getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());

    return {
      totalEntries: this.cache.size,
      maxSize: this.config.maxSize,
      utilization: `${(this.cache.size / this.config.maxSize * 100).toFixed(1)  }%`,
      expiredEntries: entries.filter(entry => this.isExpired(entry)).length,
      averageAge: entries.length > 0
        ? Math.round(entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0) / entries.length)
        : 0,
      safePrefixes: this.SAFE_PREFIXES
    };
  }
}

// Global cache manager instance
export const cacheManager = new SafeCacheManager();

// React hook for component-level caching
export const useCache = <T>(key: string, fetcher: () => Promise<T>, ttl?: number) => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      // Check cache first
      const cached = cacheManager.get<T>(key);
      if (cached) {
        setData(cached);
        return;
      }

      // Fetch new data
      setLoading(true);
      setError(null);

      try {
        const result = await fetcher();
        cacheManager.set(key, result, ttl);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cache fetch error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [key, ttl]);

  const invalidate = () => {
    cacheManager.delete(key);
    setData(null);
  };

  return { data, loading, error, invalidate };
};

// HOC for automatic component caching
export const withCaching = <P extends object>(
  Component: React.ComponentType<P>,
  cacheKey: (props: P) => string,
  ttl?: number
) => {
  return (props: P) => {
    const key = cacheKey(props);
    const startTime = Date.now();

    React.useEffect(() => {
      const loadTime = Date.now() - startTime;
      if (cacheManager.has(key)) {
        console.log(`⚡ Component cache hit: ${key} (${loadTime}ms)`);
      }
    }, [key]);

    return React.createElement(Component, props);
  };
};

// Safe cache utilities for specific data types
export const adminCache = {
  set: (key: string, data: any, ttl?: number) =>
    cacheManager.set(`admin_${key}`, data, ttl),
  get: <T>(key: string) =>
    cacheManager.get<T>(`admin_${key}`),
  delete: (key: string) =>
    cacheManager.delete(`admin_${key}`)
};

export const userCache = {
  set: (userId: string, key: string, data: any, ttl?: number) =>
    cacheManager.set(`user_profile_${userId}_${key}`, data, ttl),
  get: <T>(userId: string, key: string) =>
    cacheManager.get<T>(`user_profile_${userId}_${key}`),
  delete: (userId: string, key: string) =>
    cacheManager.delete(`user_profile_${userId}_${key}`)
};

export const pamCache = {
  set: (userId: string, key: string, data: any, ttl?: number) =>
    cacheManager.set(`pam_${userId}_${key}`, data, ttl),
  get: <T>(userId: string, key: string) =>
    cacheManager.get<T>(`pam_${userId}_${key}`),
  delete: (userId: string, key: string) =>
    cacheManager.delete(`pam_${userId}_${key}`)
};