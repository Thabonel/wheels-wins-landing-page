/**
 * PAM Response Cache System
 * 
 * Features:
 * - In-memory LRU cache with TTL support
 * - Smart cache key generation from queries
 * - User-specific data isolation
 * - Configurable invalidation strategies
 * - Cache size limits and automatic cleanup
 * - Cache analytics and hit rate monitoring
 * - Automatic cleanup on logout
 */

import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface CacheEntry<T = any> {
  id: string;
  key: string;
  data: T;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  ttl: number;
  userId?: string;
  size: number; // Estimated size in bytes
  metadata: CacheEntryMetadata;
}

export interface CacheEntryMetadata {
  query?: string;
  queryType?: string;
  userSpecific: boolean;
  sensitive: boolean;
  tags: string[];
  version: string;
  source: string; // API endpoint or service that generated this
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
  defaultTTL: number; // Default TTL in milliseconds
  enableLogging: boolean;
  enableMetrics: boolean;
  cleanupInterval: number; // Cleanup interval in milliseconds
  compressionThreshold: number; // Size threshold for compression
  enablePersistence: boolean; // Persist to localStorage
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  averageAccessTime: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  memoryUtilization: number;
  compressionRatio: number;
}

export interface CacheMetrics {
  operations: {
    gets: number;
    sets: number;
    deletes: number;
    clears: number;
    evictions: number;
  };
  performance: {
    averageGetTime: number;
    averageSetTime: number;
    totalResponseTime: number;
    cacheEfficiencyScore: number;
  };
  storage: {
    currentSize: number;
    maxSize: number;
    entryCount: number;
    compressionSavings: number;
  };
}

export interface InvalidationRule {
  id: string;
  name: string;
  condition: (entry: CacheEntry, trigger: InvalidationTrigger) => boolean;
  priority: number;
  description: string;
}

export interface InvalidationTrigger {
  type: 'user_action' | 'data_change' | 'time_based' | 'manual' | 'logout';
  userId?: string;
  resource?: string;
  tags?: string[];
  metadata?: any;
}

// =====================================================
// CACHE KEY GENERATOR
// =====================================================

export class CacheKeyGenerator {
  private static readonly KEY_VERSION = 'v2';
  private static readonly MAX_KEY_LENGTH = 250;

  /**
   * Generate a cache key from query parameters
   */
  static generateKey(
    query: any,
    userId?: string,
    options?: {
      includeTimestamp?: boolean;
      customPrefix?: string;
      excludeFields?: string[];
      sortKeys?: boolean;
    }
  ): string {
    const {
      includeTimestamp = false,
      customPrefix = 'pam',
      excludeFields = [],
      sortKeys = true
    } = options || {};

    try {
      // Create normalized query object
      const normalizedQuery = this.normalizeQuery(query, excludeFields, sortKeys);
      
      // Generate base hash
      const queryHash = this.hashObject(normalizedQuery);
      
      // Build key components
      const components = [
        this.KEY_VERSION,
        customPrefix,
        userId ? `user:${userId}` : 'global',
        queryHash
      ];

      if (includeTimestamp) {
        components.push(`ts:${Date.now()}`);
      }

      const key = components.join('|');
      
      // Ensure key length doesn't exceed limits
      if (key.length > this.MAX_KEY_LENGTH) {
        const truncatedHash = this.hashString(key);
        return `${this.KEY_VERSION}|${customPrefix}|${truncatedHash}`;
      }

      return key;
    } catch (error) {
      logger.error('Cache key generation failed', error);
      // Fallback to simple hash
      return `${this.KEY_VERSION}|${customPrefix}|${this.hashString(JSON.stringify(query))}`;
    }
  }

  /**
   * Generate cache key for API responses
   */
  static generateAPIKey(
    endpoint: string,
    params: any = {},
    userId?: string,
    method: string = 'GET'
  ): string {
    const apiQuery = {
      endpoint: endpoint.replace(/^\/+|\/+$/g, ''), // Clean endpoint
      method: method.toUpperCase(),
      params: this.normalizeQuery(params, [], true)
    };

    return this.generateKey(apiQuery, userId, {
      customPrefix: 'api',
      sortKeys: true
    });
  }

  /**
   * Generate cache key for user-specific data
   */
  static generateUserKey(
    dataType: string,
    identifier: any,
    userId: string
  ): string {
    const userQuery = {
      type: dataType,
      id: identifier,
      user: userId
    };

    return this.generateKey(userQuery, userId, {
      customPrefix: 'user',
      sortKeys: true
    });
  }

  /**
   * Extract information from cache key
   */
  static parseKey(key: string): {
    version: string;
    prefix: string;
    userId?: string;
    hash: string;
  } | null {
    try {
      const parts = key.split('|');
      if (parts.length < 3) return null;

      const [version, prefix, userPart, ...hashParts] = parts;
      const hash = hashParts.join('|') || userPart;
      
      let userId: string | undefined;
      if (userPart && userPart.startsWith('user:')) {
        userId = userPart.substring(5);
      }

      return {
        version,
        prefix,
        userId,
        hash
      };
    } catch {
      return null;
    }
  }

  // Private helper methods
  private static normalizeQuery(
    query: any,
    excludeFields: string[] = [],
    sortKeys: boolean = true
  ): any {
    if (query === null || query === undefined) {
      return null;
    }

    if (typeof query !== 'object') {
      return query;
    }

    if (Array.isArray(query)) {
      return query.map(item => this.normalizeQuery(item, excludeFields, sortKeys));
    }

    const normalized: any = {};
    const keys = sortKeys ? Object.keys(query).sort() : Object.keys(query);

    for (const key of keys) {
      if (excludeFields.includes(key)) continue;
      
      const value = query[key];
      if (value !== undefined) {
        normalized[key] = this.normalizeQuery(value, excludeFields, sortKeys);
      }
    }

    return normalized;
  }

  private static hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    return this.hashString(str);
  }

  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// =====================================================
// MAIN RESPONSE CACHE CLASS
// =====================================================

export class PAMResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessQueue: string[] = []; // LRU tracking
  private config: CacheConfig;
  private stats: CacheStats;
  private metrics: CacheMetrics;
  private invalidationRules: Map<string, InvalidationRule> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private currentUserId?: string;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      maxEntries: 10000,
      defaultTTL: 60 * 60 * 1000, // 1 hour
      enableLogging: true,
      enableMetrics: true,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      compressionThreshold: 10 * 1024, // 10KB
      enablePersistence: false,
      ...config
    };

    this.stats = this.initializeStats();
    this.metrics = this.initializeMetrics();
    
    this.setupDefaultInvalidationRules();
    this.startCleanupTimer();
    this.setupUserAuthListener();

    logger.info('🗂️ PAM Response Cache initialized', {
      maxSize: `${Math.round(this.config.maxSize / 1024 / 1024)}MB`,
      maxEntries: this.config.maxEntries,
      defaultTTL: `${this.config.defaultTTL / 1000}s`
    });
  }

  // =====================================================
  // CORE CACHE OPERATIONS
  // =====================================================

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.recordMiss();
        return null;
      }

      // Check expiration
      if (Date.now() > entry.expiresAt.getTime()) {
        this.cache.delete(key);
        this.removeFromAccessQueue(key);
        this.recordMiss();
        return null;
      }

      // Check user isolation
      if (entry.metadata.userSpecific && entry.userId !== this.currentUserId) {
        this.recordMiss();
        return null;
      }

      // Update access tracking
      entry.accessCount++;
      entry.lastAccessed = new Date();
      this.updateAccessQueue(key);
      
      this.recordHit(startTime);
      
      if (this.config.enableLogging) {
        logger.debug('📖 Cache hit', { 
          key: this.truncateKey(key), 
          accessCount: entry.accessCount,
          age: Date.now() - entry.createdAt.getTime()
        });
      }

      return this.deserializeData<T>(entry.data);
    } catch (error) {
      logger.error('Cache get failed', { key: this.truncateKey(key), error });
      this.recordMiss();
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T = any>(
    key: string,
    data: T,
    options?: {
      ttl?: number;
      tags?: string[];
      userSpecific?: boolean;
      sensitive?: boolean;
      metadata?: Partial<CacheEntryMetadata>;
    }
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const {
        ttl = this.config.defaultTTL,
        tags = [],
        userSpecific = false,
        sensitive = false,
        metadata = {}
      } = options || {};

      // Serialize and calculate size
      const serializedData = this.serializeData(data);
      const size = this.calculateSize(serializedData);

      // Check if entry would exceed size limits
      if (size > this.config.maxSize * 0.1) { // Max 10% of total cache
        logger.warn('Entry too large for cache', { 
          key: this.truncateKey(key), 
          size: Math.round(size / 1024) + 'KB' 
        });
        return false;
      }

      // Ensure cache capacity
      await this.ensureCapacity(size);

      const entry: CacheEntry<T> = {
        id: `entry_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        key,
        data: serializedData,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + ttl),
        accessCount: 0,
        lastAccessed: new Date(),
        ttl,
        userId: userSpecific ? this.currentUserId : undefined,
        size,
        metadata: {
          userSpecific,
          sensitive,
          tags,
          version: '1.0',
          source: 'api',
          ...metadata
        }
      };

      // Store in cache
      this.cache.set(key, entry);
      this.updateAccessQueue(key);
      
      // Update stats
      this.updateStats();
      this.metrics.operations.sets++;

      const setTime = Date.now() - startTime;
      this.metrics.performance.averageSetTime = this.updateAverage(
        this.metrics.performance.averageSetTime,
        setTime,
        this.metrics.operations.sets
      );

      if (this.config.enableLogging) {
        logger.debug('💾 Cache set', { 
          key: this.truncateKey(key),
          size: Math.round(size / 1024) + 'KB',
          ttl: Math.round(ttl / 1000) + 's',
          userSpecific,
          tags: tags.length > 0 ? tags : undefined
        });
      }

      return true;
    } catch (error) {
      logger.error('Cache set failed', { key: this.truncateKey(key), error });
      return false;
    }
  }

  /**
   * Delete specific entry from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const deleted = this.cache.delete(key);
      
      if (deleted) {
        this.removeFromAccessQueue(key);
        this.metrics.operations.deletes++;
        this.updateStats();
        
        if (this.config.enableLogging) {
          logger.debug('🗑️ Cache delete', { key: this.truncateKey(key) });
        }
      }
      
      return deleted;
    } catch (error) {
      logger.error('Cache delete failed', { key: this.truncateKey(key), error });
      return false;
    }
  }

  /**
   * Clear entire cache or entries matching criteria
   */
  async clear(criteria?: {
    userId?: string;
    tags?: string[];
    keyPrefix?: string;
    olderThan?: Date;
  }): Promise<number> {
    try {
      let deletedCount = 0;
      const keysToDelete: string[] = [];

      if (!criteria) {
        // Clear everything
        deletedCount = this.cache.size;
        this.cache.clear();
        this.accessQueue = [];
      } else {
        // Selective clearing
        for (const [key, entry] of this.cache.entries()) {
          let shouldDelete = true;

          if (criteria.userId && entry.userId !== criteria.userId) {
            shouldDelete = false;
          }

          if (criteria.tags && !criteria.tags.some(tag => entry.metadata.tags.includes(tag))) {
            shouldDelete = false;
          }

          if (criteria.keyPrefix && !key.startsWith(criteria.keyPrefix)) {
            shouldDelete = false;
          }

          if (criteria.olderThan && entry.createdAt > criteria.olderThan) {
            shouldDelete = false;
          }

          if (shouldDelete) {
            keysToDelete.push(key);
          }
        }

        // Delete selected entries
        keysToDelete.forEach(key => {
          this.cache.delete(key);
          this.removeFromAccessQueue(key);
          deletedCount++;
        });
      }

      this.metrics.operations.clears++;
      this.updateStats();

      if (this.config.enableLogging) {
        logger.debug('🧹 Cache clear', { deletedCount, criteria });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Cache clear failed', error);
      return 0;
    }
  }

  // =====================================================
  // CACHE MANAGEMENT
  // =====================================================

  /**
   * Ensure cache has capacity for new entry
   */
  private async ensureCapacity(requiredSize: number): Promise<void> {
    const currentSize = this.getCurrentSize();
    const availableSize = this.config.maxSize - currentSize;

    // Check entry count limit
    if (this.cache.size >= this.config.maxEntries) {
      await this.evictLRUEntries(Math.max(1, Math.floor(this.config.maxEntries * 0.1)));
    }

    // Check size limit
    if (requiredSize > availableSize) {
      const sizeToFree = requiredSize - availableSize + (this.config.maxSize * 0.1); // Extra 10%
      await this.evictBySize(sizeToFree);
    }
  }

  /**
   * Evict least recently used entries
   */
  private async evictLRUEntries(count: number): Promise<number> {
    let evicted = 0;
    const toEvict = this.accessQueue.slice(0, count);

    for (const key of toEvict) {
      if (this.cache.delete(key)) {
        this.removeFromAccessQueue(key);
        evicted++;
        this.metrics.operations.evictions++;
      }
    }

    if (evicted > 0 && this.config.enableLogging) {
      logger.debug('⚡ LRU eviction', { evicted });
    }

    return evicted;
  }

  /**
   * Evict entries by size
   */
  private async evictBySize(targetSize: number): Promise<number> {
    let freedSize = 0;
    let evicted = 0;

    // Sort by access time and size (prefer removing large, old entries)
    const sortedEntries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => {
        const ageScore = a.entry.lastAccessed.getTime() - b.entry.lastAccessed.getTime();
        const sizeScore = (b.entry.size - a.entry.size) * 0.1;
        return ageScore + sizeScore;
      });

    for (const { key, entry } of sortedEntries) {
      if (freedSize >= targetSize) break;

      if (this.cache.delete(key)) {
        this.removeFromAccessQueue(key);
        freedSize += entry.size;
        evicted++;
        this.metrics.operations.evictions++;
      }
    }

    if (evicted > 0 && this.config.enableLogging) {
      logger.debug('⚡ Size-based eviction', { 
        evicted, 
        freedSize: Math.round(freedSize / 1024) + 'KB' 
      });
    }

    return evicted;
  }

  /**
   * Clean up expired entries
   */
  private async cleanupExpired(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt.getTime()) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      if (this.cache.delete(key)) {
        this.removeFromAccessQueue(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.updateStats();
      
      if (this.config.enableLogging) {
        logger.debug('🧹 Expired entries cleaned', { cleaned });
      }
    }

    return cleaned;
  }

  // =====================================================
  // INVALIDATION SYSTEM
  // =====================================================

  /**
   * Invalidate cache entries based on trigger
   */
  async invalidate(trigger: InvalidationTrigger): Promise<number> {
    let invalidated = 0;
    const keysToInvalidate: string[] = [];

    // Apply invalidation rules
    for (const rule of this.invalidationRules.values()) {
      for (const [key, entry] of this.cache.entries()) {
        if (rule.condition(entry, trigger)) {
          if (!keysToInvalidate.includes(key)) {
            keysToInvalidate.push(key);
          }
        }
      }
    }

    // Remove invalidated entries
    for (const key of keysToInvalidate) {
      if (this.cache.delete(key)) {
        this.removeFromAccessQueue(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      this.updateStats();
      
      if (this.config.enableLogging) {
        logger.debug('❌ Cache invalidation', { 
          trigger: trigger.type, 
          invalidated,
          resource: trigger.resource
        });
      }
    }

    return invalidated;
  }

  /**
   * Add custom invalidation rule
   */
  addInvalidationRule(rule: InvalidationRule): void {
    this.invalidationRules.set(rule.id, rule);
    
    if (this.config.enableLogging) {
      logger.debug('📋 Invalidation rule added', { 
        id: rule.id, 
        name: rule.name,
        priority: rule.priority 
      });
    }
  }

  /**
   * Remove invalidation rule
   */
  removeInvalidationRule(ruleId: string): boolean {
    const removed = this.invalidationRules.delete(ruleId);
    
    if (removed && this.config.enableLogging) {
      logger.debug('📋 Invalidation rule removed', { id: ruleId });
    }
    
    return removed;
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private setupDefaultInvalidationRules(): void {
    // User logout rule
    this.addInvalidationRule({
      id: 'user_logout',
      name: 'Clear user data on logout',
      condition: (entry, trigger) => {
        return trigger.type === 'logout' && 
               (entry.metadata.userSpecific || entry.userId === trigger.userId);
      },
      priority: 100,
      description: 'Clears all user-specific data when user logs out'
    });

    // Sensitive data rule
    this.addInvalidationRule({
      id: 'sensitive_data',
      name: 'Clear sensitive data on user action',
      condition: (entry, trigger) => {
        return entry.metadata.sensitive && 
               trigger.type === 'user_action' &&
               entry.userId === trigger.userId;
      },
      priority: 90,
      description: 'Clears sensitive data on user actions'
    });

    // Tag-based invalidation
    this.addInvalidationRule({
      id: 'tag_based',
      name: 'Tag-based invalidation',
      condition: (entry, trigger) => {
        if (!trigger.tags || trigger.tags.length === 0) return false;
        return trigger.tags.some(tag => entry.metadata.tags.includes(tag));
      },
      priority: 80,
      description: 'Invalidates entries with matching tags'
    });

    // Resource-based invalidation
    this.addInvalidationRule({
      id: 'resource_based',
      name: 'Resource-based invalidation',
      condition: (entry, trigger) => {
        if (!trigger.resource) return false;
        return entry.key.includes(trigger.resource) || 
               entry.metadata.source === trigger.resource;
      },
      priority: 70,
      description: 'Invalidates entries related to specific resources'
    });
  }

  private setupUserAuthListener(): void {
    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id;
      
      if (event === 'SIGNED_OUT' || (!newUserId && this.currentUserId)) {
        // User logged out
        this.invalidate({
          type: 'logout',
          userId: this.currentUserId
        });
        this.currentUserId = undefined;
      } else if (event === 'SIGNED_IN' && newUserId !== this.currentUserId) {
        // Different user logged in
        if (this.currentUserId) {
          this.invalidate({
            type: 'logout',
            userId: this.currentUserId
          });
        }
        this.currentUserId = newUserId;
      }
    });
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      const cleaned = await this.cleanupExpired();
      
      // Periodic capacity management
      const currentSize = this.getCurrentSize();
      if (currentSize > this.config.maxSize * 0.8) { // 80% threshold
        await this.evictLRUEntries(Math.floor(this.cache.size * 0.1));
      }
    }, this.config.cleanupInterval);
  }

  private updateAccessQueue(key: string): void {
    // Remove if exists
    this.removeFromAccessQueue(key);
    // Add to end (most recently used)
    this.accessQueue.push(key);
  }

  private removeFromAccessQueue(key: string): void {
    const index = this.accessQueue.indexOf(key);
    if (index !== -1) {
      this.accessQueue.splice(index, 1);
    }
  }

  private recordHit(startTime: number): void {
    this.stats.hitCount++;
    const responseTime = Date.now() - startTime;
    this.metrics.performance.totalResponseTime += responseTime;
    this.metrics.performance.averageGetTime = this.updateAverage(
      this.metrics.performance.averageGetTime,
      responseTime,
      this.stats.hitCount
    );
    this.updateHitRate();
  }

  private recordMiss(): void {
    this.stats.missCount++;
    this.metrics.operations.gets++;
    this.updateHitRate();
  }

  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0;
    
    // Calculate cache efficiency score
    this.metrics.performance.cacheEfficiencyScore = this.calculateEfficiencyScore();
  }

  private calculateEfficiencyScore(): number {
    const hitRate = this.stats.hitRate;
    const memoryUtilization = this.stats.memoryUtilization;
    const avgResponseTime = this.metrics.performance.averageGetTime;
    
    // Weighted score: 50% hit rate, 30% memory efficiency, 20% speed
    const hitRateScore = hitRate * 0.5;
    const memoryScore = (1 - memoryUtilization) * 0.3; // Less memory usage is better
    const speedScore = Math.max(0, (10 - avgResponseTime) / 10) * 0.2; // Under 10ms is good
    
    return Math.min(1, hitRateScore + memoryScore + speedScore);
  }

  private updateStats(): void {
    this.stats.totalEntries = this.cache.size;
    this.stats.totalSize = this.getCurrentSize();
    this.stats.memoryUtilization = this.stats.totalSize / this.config.maxSize;
    
    // Update entry dates
    const entries = Array.from(this.cache.values());
    if (entries.length > 0) {
      const dates = entries.map(e => e.createdAt).sort((a, b) => a.getTime() - b.getTime());
      this.stats.oldestEntry = dates[0];
      this.stats.newestEntry = dates[dates.length - 1];
    }

    // Update compression ratio
    const uncompressedSize = entries.reduce((sum, entry) => {
      return sum + JSON.stringify(entry.data).length;
    }, 0);
    
    this.stats.compressionRatio = uncompressedSize > 0 
      ? this.stats.totalSize / uncompressedSize 
      : 1;
  }

  private updateAverage(currentAvg: number, newValue: number, count: number): number {
    if (count <= 1) return newValue;
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  private getCurrentSize(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback size estimation
      return JSON.stringify(data).length * 2; // Assume UTF-16
    }
  }

  private serializeData<T>(data: T): any {
    // For now, return as-is. Could implement compression here
    return data;
  }

  private deserializeData<T>(data: any): T {
    // For now, return as-is. Could implement decompression here
    return data;
  }

  private truncateKey(key: string): string {
    return key.length > 50 ? key.substring(0, 47) + '...' : key;
  }

  private initializeStats(): CacheStats {
    return {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
      memoryUtilization: 0,
      compressionRatio: 1
    };
  }

  private initializeMetrics(): CacheMetrics {
    return {
      operations: {
        gets: 0,
        sets: 0,
        deletes: 0,
        clears: 0,
        evictions: 0
      },
      performance: {
        averageGetTime: 0,
        averageSetTime: 0,
        totalResponseTime: 0,
        cacheEfficiencyScore: 0
      },
      storage: {
        currentSize: 0,
        maxSize: this.config.maxSize,
        entryCount: 0,
        compressionSavings: 0
      }
    };
  }

  // =====================================================
  // PUBLIC API METHODS
  // =====================================================

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get detailed cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateStats();
    this.metrics.storage.currentSize = this.stats.totalSize;
    this.metrics.storage.entryCount = this.stats.totalEntries;
    this.metrics.storage.compressionSavings = this.calculateCompressionSavings();
    
    return { ...this.metrics };
  }

  private calculateCompressionSavings(): number {
    const entries = Array.from(this.cache.values());
    const actualSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const uncompressedSize = entries.reduce((sum, entry) => {
      return sum + JSON.stringify(entry.data).length * 2; // UTF-16 estimate
    }, 0);
    
    return Math.max(0, uncompressedSize - actualSize);
  }

  /**
   * Check if key exists in cache (without affecting access)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check expiration
    if (Date.now() > entry.expiresAt.getTime()) {
      this.cache.delete(key);
      this.removeFromAccessQueue(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache keys matching pattern
   */
  getKeys(pattern?: string): string[] {
    const keys = Array.from(this.cache.keys());
    
    if (!pattern) return keys;
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  /**
   * Get entries by tag
   */
  getEntriesByTag(tag: string): CacheEntry[] {
    return Array.from(this.cache.values())
      .filter(entry => entry.metadata.tags.includes(tag));
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart cleanup timer if interval changed
    if (newConfig.cleanupInterval) {
      this.startCleanupTimer();
    }
    
    if (this.config.enableLogging) {
      logger.debug('⚙️ Cache config updated', newConfig);
    }
  }

  /**
   * Export cache state for debugging
   */
  exportState(): any {
    return {
      config: this.config,
      stats: this.getStats(),
      metrics: this.getMetrics(),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key: this.truncateKey(key),
        size: entry.size,
        ttl: entry.ttl,
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
        accessCount: entry.accessCount,
        metadata: entry.metadata
      })),
      invalidationRules: Array.from(this.invalidationRules.values()).map(rule => ({
        id: rule.id,
        name: rule.name,
        priority: rule.priority,
        description: rule.description
      }))
    };
  }

  /**
   * Cleanup and dispose cache
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.cache.clear();
    this.accessQueue = [];
    this.invalidationRules.clear();
    
    logger.info('🗑️ PAM Response Cache disposed');
  }
}

// =====================================================
// CACHE DECORATOR FOR AUTOMATIC CACHING
// =====================================================

export function cacheable(options?: {
  ttl?: number;
  keyGenerator?: (args: any[]) => string;
  tags?: string[];
  userSpecific?: boolean;
}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const cache = new PAMResponseCache();

    descriptor.value = async function (...args: any[]) {
      const key = options?.keyGenerator
        ? options.keyGenerator(args)
        : CacheKeyGenerator.generateKey({ method: propertyName, args });

      // Try to get from cache
      const cached = await cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await method.apply(this, args);

      // Cache the result
      await cache.set(key, result, {
        ttl: options?.ttl,
        tags: options?.tags,
        userSpecific: options?.userSpecific
      });

      return result;
    };

    return descriptor;
  };
}

// Create singleton instance
export const pamResponseCache = new PAMResponseCache();

export default PAMResponseCache;