/**
 * PAM Cache Integration Helper
 * 
 * This module provides easy integration of the response cache with PAM services,
 * API calls, and React components. It includes wrapper functions, hooks, and
 * utilities to achieve the 30% API reduction target.
 */

import { pamResponseCache, CacheKeyGenerator, type CacheEntry } from './responseCache';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// CACHE INTEGRATION WRAPPER
// =====================================================

export class CacheIntegration {
  private static instance: CacheIntegration;
  private userId?: string;
  private stats = {
    totalApiCalls: 0,
    cachedApiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  private constructor() {
    this.setupAuthListener();
  }

  static getInstance(): CacheIntegration {
    if (!CacheIntegration.instance) {
      CacheIntegration.instance = new CacheIntegration();
    }
    return CacheIntegration.instance;
  }

  private setupAuthListener(): void {
    supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id;
      
      if (event === 'SIGNED_OUT' || (!newUserId && this.userId)) {
        // User logged out - clear user-specific cache
        pamResponseCache.invalidate({
          type: 'logout',
          userId: this.userId
        });
        this.userId = undefined;
        
        logger.info('🧹 Cache cleared on user logout');
      } else if (event === 'SIGNED_IN' && newUserId) {
        this.userId = newUserId;
        
        logger.info('👤 Cache user context updated', { userId: newUserId });
      }
    });
  }

  // =====================================================
  // API CACHING WRAPPER
  // =====================================================

  /**
   * Cached API call wrapper - automatically caches GET requests
   */
  async cachedApiCall<T = any>(
    apiCall: () => Promise<T>,
    options: {
      endpoint: string;
      params?: any;
      method?: string;
      ttl?: number;
      tags?: string[];
      userSpecific?: boolean;
      bypassCache?: boolean;
    }
  ): Promise<T> {
    const {
      endpoint,
      params = {},
      method = 'GET',
      ttl = 60 * 60 * 1000, // 1 hour default
      tags = [],
      userSpecific = false,
      bypassCache = false
    } = options;

    this.stats.totalApiCalls++;

    // Skip cache for non-GET requests or when bypassed
    if (method !== 'GET' || bypassCache) {
      const result = await apiCall();
      
      // Invalidate related cache entries for write operations
      if (method !== 'GET') {
        await pamResponseCache.invalidate({
          type: 'data_change',
          resource: endpoint,
          tags
        });
      }
      
      return result;
    }

    // Generate cache key
    const cacheKey = CacheKeyGenerator.generateAPIKey(
      endpoint,
      params,
      userSpecific ? this.userId : undefined,
      method
    );

    // Try to get from cache first
    const cachedResult = await pamResponseCache.get<T>(cacheKey);
    
    if (cachedResult !== null) {
      this.stats.cacheHits++;
      this.stats.cachedApiCalls++;
      
      logger.debug('📖 API cache hit', { 
        endpoint: this.truncateEndpoint(endpoint),
        cacheKey: this.truncateKey(cacheKey)
      });
      
      return cachedResult;
    }

    // Cache miss - make API call
    this.stats.cacheMisses++;
    
    logger.debug('📡 API cache miss - fetching', { 
      endpoint: this.truncateEndpoint(endpoint)
    });

    try {
      const result = await apiCall();
      
      // Cache the result
      await pamResponseCache.set(cacheKey, result, {
        ttl,
        tags: [...tags, 'api', endpoint.split('/')[2] || 'unknown'], // Add resource tag
        userSpecific,
        metadata: {
          source: endpoint,
          query: JSON.stringify(params),
          queryType: method
        }
      });

      return result;
    } catch (error) {
      // Don't cache errors, but log them
      logger.error('API call failed', { endpoint, error });
      throw error;
    }
  }

  /**
   * Cached Supabase query wrapper
   */
  async cachedSupabaseQuery<T = any>(
    queryBuilder: any,
    options: {
      table: string;
      operation: string;
      ttl?: number;
      tags?: string[];
      userSpecific?: boolean;
    }
  ): Promise<T> {
    const {
      table,
      operation,
      ttl = 30 * 60 * 1000, // 30 minutes default for DB queries
      tags = [],
      userSpecific = true // DB queries are usually user-specific
    } = options;

    // Generate cache key from query
    const queryString = queryBuilder.toString?.() || JSON.stringify(queryBuilder);
    const cacheKey = CacheKeyGenerator.generateKey(
      { table, operation, query: queryString },
      userSpecific ? this.userId : undefined,
      { customPrefix: 'supabase' }
    );

    this.stats.totalApiCalls++;

    // Try cache first
    const cachedResult = await pamResponseCache.get<T>(cacheKey);
    
    if (cachedResult !== null) {
      this.stats.cacheHits++;
      this.stats.cachedApiCalls++;
      
      logger.debug('📖 Supabase cache hit', { 
        table, 
        operation,
        cacheKey: this.truncateKey(cacheKey)
      });
      
      return cachedResult;
    }

    // Cache miss - execute query
    this.stats.cacheMisses++;
    
    logger.debug('📡 Supabase cache miss - querying', { table, operation });

    try {
      const { data, error } = await queryBuilder;
      
      if (error) throw error;

      // Cache the result
      await pamResponseCache.set(cacheKey, data, {
        ttl,
        tags: [...tags, 'supabase', table, operation],
        userSpecific,
        metadata: {
          source: `supabase:${table}`,
          queryType: operation,
          query: queryString.substring(0, 100) // Truncate long queries
        }
      });

      return data;
    } catch (error) {
      logger.error('Supabase query failed', { table, operation, error });
      throw error;
    }
  }

  // =====================================================
  // CACHE PRELOADING
  // =====================================================

  /**
   * Preload common data into cache
   */
  async preloadCommonData(): Promise<void> {
    if (!this.userId) {
      logger.debug('⚠️ Skipping preload - no user authenticated');
      return;
    }

    logger.info('🔄 Preloading common data into cache');

    try {
      // Preload user profile
      await this.cachedSupabaseQuery(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', this.userId)
          .single(),
        {
          table: 'profiles',
          operation: 'select',
          ttl: 2 * 60 * 60 * 1000, // 2 hours
          tags: ['profile', 'user-data']
        }
      );

      // Preload user settings
      await this.cachedSupabaseQuery(
        supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', this.userId),
        {
          table: 'user_settings',
          operation: 'select',
          ttl: 60 * 60 * 1000, // 1 hour
          tags: ['settings', 'user-data']
        }
      );

      // Preload recent expenses
      await this.cachedSupabaseQuery(
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', this.userId)
          .order('created_at', { ascending: false })
          .limit(50),
        {
          table: 'expenses',
          operation: 'recent_select',
          ttl: 15 * 60 * 1000, // 15 minutes
          tags: ['expenses', 'user-data', 'recent']
        }
      );

      logger.info('✅ Common data preloaded successfully');
    } catch (error) {
      logger.warn('⚠️ Failed to preload some data', error);
    }
  }

  /**
   * Prefetch data based on user behavior patterns
   */
  async prefetchPredictiveData(currentPage: string): Promise<void> {
    if (!this.userId) return;

    const prefetchMap: Record<string, () => Promise<void>> = {
      '/wheels': async () => {
        // User on wheels page - prefetch trip data
        await this.cachedSupabaseQuery(
          supabase
            .from('trips')
            .select('*')
            .eq('user_id', this.userId)
            .order('created_at', { ascending: false })
            .limit(20),
          {
            table: 'trips',
            operation: 'recent_select',
            ttl: 30 * 60 * 1000,
            tags: ['trips', 'user-data']
          }
        );
      },
      '/wins': async () => {
        // User on wins page - prefetch financial data
        await this.cachedSupabaseQuery(
          supabase
            .from('budgets')
            .select('*')
            .eq('user_id', this.userId),
          {
            table: 'budgets',
            operation: 'select',
            ttl: 30 * 60 * 1000,
            tags: ['budgets', 'user-data']
          }
        );
      }
    };

    const prefetchFn = prefetchMap[currentPage];
    if (prefetchFn) {
      try {
        await prefetchFn();
        logger.debug('🔮 Predictive data prefetched', { currentPage });
      } catch (error) {
        logger.debug('Failed to prefetch predictive data', { currentPage, error });
      }
    }
  }

  // =====================================================
  // CACHE OPTIMIZATION
  // =====================================================

  /**
   * Optimize cache for better hit rates
   */
  async optimizeCache(): Promise<void> {
    logger.info('⚡ Optimizing cache for better performance');

    const stats = pamResponseCache.getStats();
    
    // If hit rate is low, extend TTL for commonly accessed data
    if (stats.hitRate < 0.5) {
      logger.debug('📊 Low hit rate detected, extending TTLs');
      
      // Find frequently accessed entries and extend their TTL
      const frequentEntries = pamResponseCache.getKeys('*').filter(key => {
        const entry = (pamResponseCache as any).cache.get(key);
        return entry && entry.accessCount > 5;
      });

      for (const key of frequentEntries) {
        const entry = (pamResponseCache as any).cache.get(key) as CacheEntry;
        if (entry) {
          // Extend expiration by 50%
          const extension = entry.ttl * 0.5;
          entry.expiresAt = new Date(entry.expiresAt.getTime() + extension);
        }
      }
    }

    // Clean up expired entries
    await pamResponseCache.clear({
      olderThan: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
    });
  }

  /**
   * Invalidate cache based on user actions
   */
  async invalidateByUserAction(action: string, resource?: string): Promise<void> {
    const invalidationRules: Record<string, string[]> = {
      'expense_created': ['expenses', 'budgets', 'financial-summary'],
      'trip_created': ['trips', 'recent-trips'],
      'profile_updated': ['profile', 'user-data'],
      'settings_changed': ['settings', 'user-preferences']
    };

    const tagsToInvalidate = invalidationRules[action];
    
    if (tagsToInvalidate) {
      await pamResponseCache.invalidate({
        type: 'user_action',
        userId: this.userId,
        tags: tagsToInvalidate,
        resource
      });

      logger.debug('❌ Cache invalidated by user action', { 
        action, 
        tags: tagsToInvalidate,
        resource 
      });
    }
  }

  // =====================================================
  // ANALYTICS AND MONITORING
  // =====================================================

  /**
   * Get cache performance metrics
   */
  getCachePerformance(): {
    apiReductionRate: number;
    hitRate: number;
    totalApiCalls: number;
    cachedApiCalls: number;
    estimatedSavings: {
      requests: number;
      responseTimeMs: number;
      costReduction: number;
    };
  } {
    const cacheStats = pamResponseCache.getStats();
    const apiReductionRate = this.stats.totalApiCalls > 0 
      ? this.stats.cachedApiCalls / this.stats.totalApiCalls 
      : 0;

    // Estimate savings (assuming 200ms average API response time, $0.001 per request)
    const savedRequests = this.stats.cacheHits;
    const estimatedResponseTimeSaving = savedRequests * 200; // 200ms per saved request
    const estimatedCostSaving = savedRequests * 0.001; // $0.001 per saved request

    return {
      apiReductionRate,
      hitRate: cacheStats.hitRate,
      totalApiCalls: this.stats.totalApiCalls,
      cachedApiCalls: this.stats.cachedApiCalls,
      estimatedSavings: {
        requests: savedRequests,
        responseTimeMs: estimatedResponseTimeSaving,
        costReduction: estimatedCostSaving
      }
    };
  }

  /**
   * Generate cache performance report
   */
  generatePerformanceReport(): string {
    const performance = this.getCachePerformance();
    const cacheStats = pamResponseCache.getStats();
    const metrics = pamResponseCache.getMetrics();

    const report = `
# PAM Cache Performance Report

## API Reduction Metrics
- **API Reduction Rate**: ${(performance.apiReductionRate * 100).toFixed(1)}% ${performance.apiReductionRate >= 0.3 ? '✅' : '⚠️'}
- **Total API Calls**: ${performance.totalApiCalls}
- **Cached API Calls**: ${performance.cachedApiCalls}
- **Cache Hit Rate**: ${(performance.hitRate * 100).toFixed(1)}%

## Estimated Savings
- **Saved Requests**: ${performance.estimatedSavings.requests}
- **Response Time Saved**: ${(performance.estimatedSavings.responseTimeMs / 1000).toFixed(1)}s
- **Estimated Cost Reduction**: $${performance.estimatedSavings.costReduction.toFixed(3)}

## Cache Statistics
- **Total Entries**: ${cacheStats.totalEntries}
- **Cache Size**: ${Math.round(cacheStats.totalSize / 1024)}KB
- **Memory Utilization**: ${(cacheStats.memoryUtilization * 100).toFixed(1)}%
- **Average Response Time**: ${metrics.performance.averageGetTime.toFixed(2)}ms
- **Cache Efficiency Score**: ${(metrics.performance.cacheEfficiencyScore * 100).toFixed(1)}%

## Target Achievement
${performance.apiReductionRate >= 0.3 
  ? '🎯 **TARGET ACHIEVED**: 30% API reduction exceeded!'
  : `🎯 **TARGET PROGRESS**: ${(performance.apiReductionRate * 100).toFixed(1)}% of 30% target`}
    `;

    return report.trim();
  }

  /**
   * Reset cache statistics (for testing)
   */
  resetStats(): void {
    this.stats = {
      totalApiCalls: 0,
      cachedApiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private truncateEndpoint(endpoint: string): string {
    return endpoint.length > 30 ? `${endpoint.substring(0, 27)  }...` : endpoint;
  }

  private truncateKey(key: string): string {
    return key.length > 50 ? `${key.substring(0, 47)  }...` : key;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | undefined {
    return this.userId;
  }

  /**
   * Check if cache is available
   */
  isCacheAvailable(): boolean {
    try {
      return pamResponseCache.getStats().totalEntries >= 0;
    } catch {
      return false;
    }
  }
}

// =====================================================
// REACT HOOKS FOR CACHE INTEGRATION
// =====================================================

// Note: These would be in a separate hooks file in a real implementation
// but included here for completeness

/**
 * Hook for cached API calls
 */
export function useCachedApi() {
  const cacheIntegration = CacheIntegration.getInstance();

  return {
    cachedApiCall: cacheIntegration.cachedApiCall.bind(cacheIntegration),
    cachedSupabaseQuery: cacheIntegration.cachedSupabaseQuery.bind(cacheIntegration),
    invalidateByAction: cacheIntegration.invalidateByUserAction.bind(cacheIntegration),
    getCachePerformance: cacheIntegration.getCachePerformance.bind(cacheIntegration)
  };
}

/**
 * Hook for cache statistics
 */
export function useCacheStats() {
  const cacheIntegration = CacheIntegration.getInstance();
  
  return {
    stats: cacheIntegration.getCachePerformance(),
    report: cacheIntegration.generatePerformanceReport(),
    isAvailable: cacheIntegration.isCacheAvailable()
  };
}

// Export singleton instance for direct use
export const cacheIntegration = CacheIntegration.getInstance();

export default CacheIntegration;