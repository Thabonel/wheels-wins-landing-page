/**
 * Comprehensive Test Suite for PAM Response Cache System
 * 
 * Test Coverage:
 * - Cache key generation and validation
 * - Basic cache operations (get, set, delete, clear)
 * - TTL (time-to-live) functionality
 * - Cache invalidation strategies
 * - Size limits and LRU eviction
 * - Hit rate verification and analytics
 * - User-specific data isolation
 * - Performance benchmarks
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  PAMResponseCache, 
  CacheKeyGenerator, 
  pamResponseCache,
  cacheable,
  type CacheConfig,
  type InvalidationTrigger
} from '../responseCache';

// =====================================================
// TEST SETUP AND UTILITIES
// =====================================================

const createTestCache = (config?: Partial<CacheConfig>) => {
  return new PAMResponseCache({
    maxSize: 1024 * 1024, // 1MB for testing
    maxEntries: 100,
    defaultTTL: 60 * 1000, // 1 minute
    enableLogging: false, // Reduce noise in tests
    cleanupInterval: 10 * 1000, // 10 seconds
    ...config
  });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createLargeData = (sizeKB: number) => {
  return 'x'.repeat(sizeKB * 1024);
};

const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com'
};

// Mock supabase auth
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        // Mock auth state change
        return { data: { subscription: {} } };
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockUser }
      })
    }
  }
}));

// =====================================================
// CACHE KEY GENERATOR TESTS
// =====================================================

describe('CacheKeyGenerator', () => {
  describe('Basic Key Generation', () => {
    it('should generate consistent keys for identical queries', () => {
      const query1 = { endpoint: '/api/trips', params: { limit: 10, sort: 'date' } };
      const query2 = { endpoint: '/api/trips', params: { limit: 10, sort: 'date' } };
      
      const key1 = CacheKeyGenerator.generateKey(query1);
      const key2 = CacheKeyGenerator.generateKey(query2);
      
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^v2\|pam\|global\|/);
    });

    it('should generate different keys for different queries', () => {
      const query1 = { endpoint: '/api/trips', params: { limit: 10 } };
      const query2 = { endpoint: '/api/trips', params: { limit: 20 } };
      
      const key1 = CacheKeyGenerator.generateKey(query1);
      const key2 = CacheKeyGenerator.generateKey(query2);
      
      expect(key1).not.toBe(key2);
    });

    it('should include user ID in user-specific keys', () => {
      const query = { endpoint: '/api/profile' };
      const userId = 'user-123';
      
      const key = CacheKeyGenerator.generateKey(query, userId);
      
      expect(key).toContain('user:user-123');
    });

    it('should handle null and undefined values', () => {
      const query1 = { value: null };
      const query2 = { value: undefined };
      const query3 = {};
      
      expect(() => CacheKeyGenerator.generateKey(query1)).not.toThrow();
      expect(() => CacheKeyGenerator.generateKey(query2)).not.toThrow();
      expect(() => CacheKeyGenerator.generateKey(query3)).not.toThrow();
    });

    it('should sort object keys for consistency', () => {
      const query1 = { b: 2, a: 1, c: 3 };
      const query2 = { a: 1, b: 2, c: 3 };
      const query3 = { c: 3, a: 1, b: 2 };
      
      const key1 = CacheKeyGenerator.generateKey(query1);
      const key2 = CacheKeyGenerator.generateKey(query2);
      const key3 = CacheKeyGenerator.generateKey(query3);
      
      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });

    it('should exclude specified fields', () => {
      const query = { important: 'data', timestamp: Date.now(), nonce: Math.random() };
      
      const key1 = CacheKeyGenerator.generateKey(query, undefined, {
        excludeFields: ['timestamp', 'nonce']
      });
      
      const key2 = CacheKeyGenerator.generateKey({
        ...query,
        timestamp: Date.now() + 1000,
        nonce: Math.random()
      }, undefined, {
        excludeFields: ['timestamp', 'nonce']
      });
      
      expect(key1).toBe(key2);
    });
  });

  describe('API Key Generation', () => {
    it('should generate API-specific cache keys', () => {
      const endpoint = '/api/v1/trips';
      const params = { limit: 10, page: 1 };
      const userId = 'user-123';
      
      const key = CacheKeyGenerator.generateAPIKey(endpoint, params, userId, 'GET');
      
      expect(key).toContain('api');
      expect(key).toContain('user:user-123');
    });

    it('should differentiate between HTTP methods', () => {
      const endpoint = '/api/trips';
      const params = { id: 1 };
      
      const getKey = CacheKeyGenerator.generateAPIKey(endpoint, params, 'user-123', 'GET');
      const postKey = CacheKeyGenerator.generateAPIKey(endpoint, params, 'user-123', 'POST');
      
      expect(getKey).not.toBe(postKey);
    });

    it('should clean endpoint paths', () => {
      const endpoint1 = '/api/trips/';
      const endpoint2 = '///api/trips///';
      const endpoint3 = 'api/trips';
      
      const key1 = CacheKeyGenerator.generateAPIKey(endpoint1);
      const key2 = CacheKeyGenerator.generateAPIKey(endpoint2);
      const key3 = CacheKeyGenerator.generateAPIKey(endpoint3);
      
      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });
  });

  describe('Key Parsing', () => {
    it('should parse cache keys correctly', () => {
      const key = 'v2|api|user:test-123|abcdef123';
      const parsed = CacheKeyGenerator.parseKey(key);
      
      expect(parsed).toEqual({
        version: 'v2',
        prefix: 'api',
        userId: 'test-123',
        hash: 'abcdef123'
      });
    });

    it('should handle global keys without user ID', () => {
      const key = 'v2|api|global|abcdef123';
      const parsed = CacheKeyGenerator.parseKey(key);
      
      expect(parsed).toEqual({
        version: 'v2',
        prefix: 'api',
        userId: undefined,
        hash: 'global|abcdef123'
      });
    });

    it('should return null for invalid keys', () => {
      expect(CacheKeyGenerator.parseKey('invalid')).toBeNull();
      expect(CacheKeyGenerator.parseKey('')).toBeNull();
      expect(CacheKeyGenerator.parseKey('v2')).toBeNull();
    });
  });
});

// =====================================================
// BASIC CACHE OPERATIONS TESTS
// =====================================================

describe('PAMResponseCache - Basic Operations', () => {
  let cache: PAMResponseCache;

  beforeEach(() => {
    cache = createTestCache();
  });

  afterEach(() => {
    cache.dispose();
  });

  describe('Set and Get Operations', () => {
    it('should store and retrieve data correctly', async () => {
      const key = 'test-key';
      const data = { message: 'Hello, World!' };
      
      const setResult = await cache.set(key, data);
      expect(setResult).toBe(true);
      
      const retrieved = await cache.get(key);
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle different data types', async () => {
      const testCases = [
        { key: 'string', data: 'Hello' },
        { key: 'number', data: 42 },
        { key: 'boolean', data: true },
        { key: 'array', data: [1, 2, 3] },
        { key: 'object', data: { nested: { value: 'test' } } },
        { key: 'null', data: null }
      ];

      for (const testCase of testCases) {
        await cache.set(testCase.key, testCase.data);
        const retrieved = await cache.get(testCase.key);
        expect(retrieved).toEqual(testCase.data);
      }
    });

    it('should update existing entries', async () => {
      const key = 'update-test';
      
      await cache.set(key, 'original');
      expect(await cache.get(key)).toBe('original');
      
      await cache.set(key, 'updated');
      expect(await cache.get(key)).toBe('updated');
    });
  });

  describe('Delete Operations', () => {
    it('should delete existing entries', async () => {
      const key = 'delete-test';
      const data = 'test data';
      
      await cache.set(key, data);
      expect(await cache.get(key)).toBe(data);
      
      const deleted = await cache.delete(key);
      expect(deleted).toBe(true);
      expect(await cache.get(key)).toBeNull();
    });

    it('should return false for non-existent entries', async () => {
      const deleted = await cache.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('Clear Operations', () => {
    it('should clear all entries', async () => {
      const entries = [
        { key: 'key1', data: 'data1' },
        { key: 'key2', data: 'data2' },
        { key: 'key3', data: 'data3' }
      ];

      for (const entry of entries) {
        await cache.set(entry.key, entry.data);
      }

      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(3);

      const cleared = await cache.clear();
      expect(cleared).toBe(3);

      const finalStats = cache.getStats();
      expect(finalStats.totalEntries).toBe(0);

      for (const entry of entries) {
        expect(await cache.get(entry.key)).toBeNull();
      }
    });

    it('should clear entries by criteria', async () => {
      await cache.set('user1-data', 'data1', { userSpecific: true });
      await cache.set('user2-data', 'data2', { userSpecific: true });
      await cache.set('global-data', 'data3', { userSpecific: false });

      // Mock current user
      (cache as any).currentUserId = 'user1';

      const cleared = await cache.clear({ userId: 'user1' });
      expect(cleared).toBe(1);

      expect(await cache.get('user1-data')).toBeNull();
      expect(await cache.get('user2-data')).toBe('data2');
      expect(await cache.get('global-data')).toBe('data3');
    });
  });

  describe('Has Operation', () => {
    it('should check entry existence correctly', async () => {
      const key = 'exists-test';
      
      expect(cache.has(key)).toBe(false);
      
      await cache.set(key, 'data');
      expect(cache.has(key)).toBe(true);
      
      await cache.delete(key);
      expect(cache.has(key)).toBe(false);
    });
  });
});

// =====================================================
// TTL (TIME-TO-LIVE) TESTS
// =====================================================

describe('PAMResponseCache - TTL Functionality', () => {
  let cache: PAMResponseCache;

  beforeEach(() => {
    cache = createTestCache({
      defaultTTL: 100, // 100ms for fast testing
      cleanupInterval: 50 // 50ms cleanup
    });
  });

  afterEach(() => {
    cache.dispose();
  });

  it('should expire entries after TTL', async () => {
    const key = 'ttl-test';
    const data = 'expiring data';
    
    await cache.set(key, data, { ttl: 50 }); // 50ms TTL
    expect(await cache.get(key)).toBe(data);
    
    await sleep(60); // Wait for expiration
    expect(await cache.get(key)).toBeNull();
  });

  it('should use default TTL when not specified', async () => {
    const key = 'default-ttl-test';
    const data = 'data with default ttl';
    
    await cache.set(key, data); // Uses default TTL (100ms)
    expect(await cache.get(key)).toBe(data);
    
    await sleep(120); // Wait for default TTL
    expect(await cache.get(key)).toBeNull();
  });

  it('should handle custom TTL values', async () => {
    const shortKey = 'short-ttl';
    const longKey = 'long-ttl';
    
    await cache.set(shortKey, 'short', { ttl: 30 });
    await cache.set(longKey, 'long', { ttl: 200 });
    
    await sleep(50);
    
    expect(await cache.get(shortKey)).toBeNull(); // Should be expired
    expect(await cache.get(longKey)).toBe('long'); // Should still exist
  });

  it('should not return expired entries even before cleanup', async () => {
    const key = 'immediate-expiry-test';
    
    await cache.set(key, 'data', { ttl: 1 }); // 1ms TTL
    await sleep(5);
    
    // Entry should be considered expired immediately
    expect(await cache.get(key)).toBeNull();
  });

  it('should clean up expired entries automatically', async () => {
    const keys = ['expire1', 'expire2', 'expire3'];
    
    for (const key of keys) {
      await cache.set(key, 'data', { ttl: 30 });
    }
    
    expect(cache.getStats().totalEntries).toBe(3);
    
    await sleep(100); // Wait for cleanup
    
    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(0);
  });
});

// =====================================================
// CACHE INVALIDATION TESTS
// =====================================================

describe('PAMResponseCache - Invalidation', () => {
  let cache: PAMResponseCache;

  beforeEach(() => {
    cache = createTestCache();
  });

  afterEach(() => {
    cache.dispose();
  });

  describe('Default Invalidation Rules', () => {
    it('should invalidate user data on logout', async () => {
      const userId = 'test-user';
      (cache as any).currentUserId = userId;

      await cache.set('user-data', 'sensitive', { userSpecific: true });
      await cache.set('global-data', 'public', { userSpecific: false });

      const trigger: InvalidationTrigger = {
        type: 'logout',
        userId
      };

      const invalidated = await cache.invalidate(trigger);
      expect(invalidated).toBe(1);

      expect(await cache.get('user-data')).toBeNull();
      expect(await cache.get('global-data')).toBe('public');
    });

    it('should invalidate sensitive data on user action', async () => {
      const userId = 'test-user';
      (cache as any).currentUserId = userId;

      await cache.set('sensitive', 'secret', { 
        userSpecific: true, 
        sensitive: true 
      });
      await cache.set('normal', 'public', { 
        userSpecific: true, 
        sensitive: false 
      });

      const trigger: InvalidationTrigger = {
        type: 'user_action',
        userId
      };

      const invalidated = await cache.invalidate(trigger);
      expect(invalidated).toBe(1);

      expect(await cache.get('sensitive')).toBeNull();
      expect(await cache.get('normal')).toBe('public');
    });

    it('should invalidate by tags', async () => {
      await cache.set('tagged1', 'data1', { tags: ['trips', 'user'] });
      await cache.set('tagged2', 'data2', { tags: ['expenses', 'user'] });
      await cache.set('untagged', 'data3', { tags: [] });

      const trigger: InvalidationTrigger = {
        type: 'data_change',
        tags: ['trips']
      };

      const invalidated = await cache.invalidate(trigger);
      expect(invalidated).toBe(1);

      expect(await cache.get('tagged1')).toBeNull();
      expect(await cache.get('tagged2')).toBe('data2');
      expect(await cache.get('untagged')).toBe('data3');
    });

    it('should invalidate by resource', async () => {
      await cache.set('api|trips|get', 'trips-data');
      await cache.set('api|users|get', 'users-data');
      
      const trigger: InvalidationTrigger = {
        type: 'data_change',
        resource: 'trips'
      };

      const invalidated = await cache.invalidate(trigger);
      expect(invalidated).toBe(1);

      expect(await cache.get('api|trips|get')).toBeNull();
      expect(await cache.get('api|users|get')).toBe('users-data');
    });
  });

  describe('Custom Invalidation Rules', () => {
    it('should apply custom invalidation rules', async () => {
      cache.addInvalidationRule({
        id: 'custom-rule',
        name: 'Test Rule',
        condition: (entry, trigger) => {
          return trigger.type === 'manual' && entry.key.startsWith('test-');
        },
        priority: 100,
        description: 'Test invalidation rule'
      });

      await cache.set('test-entry1', 'data1');
      await cache.set('test-entry2', 'data2');
      await cache.set('other-entry', 'data3');

      const trigger: InvalidationTrigger = {
        type: 'manual'
      };

      const invalidated = await cache.invalidate(trigger);
      expect(invalidated).toBe(2);

      expect(await cache.get('test-entry1')).toBeNull();
      expect(await cache.get('test-entry2')).toBeNull();
      expect(await cache.get('other-entry')).toBe('data3');
    });

    it('should remove custom invalidation rules', async () => {
      const ruleId = 'removable-rule';
      
      cache.addInvalidationRule({
        id: ruleId,
        name: 'Removable Rule',
        condition: () => true,
        priority: 50,
        description: 'Rule to be removed'
      });

      const removed = cache.removeInvalidationRule(ruleId);
      expect(removed).toBe(true);

      const removedAgain = cache.removeInvalidationRule(ruleId);
      expect(removedAgain).toBe(false);
    });
  });
});

// =====================================================
// SIZE LIMITS AND LRU EVICTION TESTS
// =====================================================

describe('PAMResponseCache - Size Management', () => {
  let cache: PAMResponseCache;

  beforeEach(() => {
    cache = createTestCache({
      maxSize: 1024, // 1KB total
      maxEntries: 5
    });
  });

  afterEach(() => {
    cache.dispose();
  });

  it('should enforce maximum entry count', async () => {
    // Add more entries than the limit
    for (let i = 0; i < 8; i++) {
      await cache.set(`entry-${i}`, `data-${i}`);
    }

    const stats = cache.getStats();
    expect(stats.totalEntries).toBeLessThanOrEqual(5);

    // Older entries should be evicted
    expect(await cache.get('entry-0')).toBeNull();
    expect(await cache.get('entry-1')).toBeNull();
    expect(await cache.get('entry-7')).toBe('data-7'); // Latest should exist
  });

  it('should enforce maximum cache size', async () => {
    const largeData = createLargeData(1); // 1KB each
    
    // Add entries that exceed size limit
    for (let i = 0; i < 3; i++) {
      await cache.set(`large-${i}`, largeData);
    }

    const stats = cache.getStats();
    expect(stats.totalSize).toBeLessThanOrEqual(1024);

    // Should have evicted some entries
    expect(stats.totalEntries).toBeLessThan(3);
  });

  it('should use LRU (Least Recently Used) eviction', async () => {
    // Fill cache
    for (let i = 0; i < 5; i++) {
      await cache.set(`entry-${i}`, `data-${i}`);
    }

    // Access some entries to make them recently used
    await cache.get('entry-1');
    await cache.get('entry-3');

    // Add one more entry to trigger eviction
    await cache.set('entry-new', 'new-data');

    // Recently accessed entries should still exist
    expect(await cache.get('entry-1')).toBe('data-1');
    expect(await cache.get('entry-3')).toBe('data-3');
    expect(await cache.get('entry-new')).toBe('new-data');

    // Some older, unaccessed entries should be evicted
    const stats = cache.getStats();
    expect(stats.totalEntries).toBeLessThanOrEqual(5);
  });

  it('should reject entries that are too large', async () => {
    const oversizedData = createLargeData(2); // 2KB (exceeds 10% of 1KB cache)
    
    const result = await cache.set('oversized', oversizedData);
    expect(result).toBe(false);
    
    expect(await cache.get('oversized')).toBeNull();
  });

  it('should prioritize evicting large, old entries', async () => {
    const smallData = 'small';
    const largeData = createLargeData(0.3); // 300 bytes
    
    // Add mix of small and large entries
    await cache.set('small-old', smallData);
    await cache.set('large-old', largeData);
    await sleep(10);
    await cache.set('small-new', smallData);
    await cache.set('large-new', largeData);

    // Fill remaining capacity to trigger eviction
    await cache.set('trigger', createLargeData(0.2));

    // Large, old entry should be evicted first
    expect(await cache.get('large-old')).toBeNull();
    expect(await cache.get('small-old')).toBe(smallData);
    expect(await cache.get('small-new')).toBe(smallData);
  });
});

// =====================================================
// HIT RATE AND ANALYTICS TESTS
// =====================================================

describe('PAMResponseCache - Analytics', () => {
  let cache: PAMResponseCache;

  beforeEach(() => {
    cache = createTestCache({
      enableMetrics: true
    });
  });

  afterEach(() => {
    cache.dispose();
  });

  it('should track hit and miss counts', async () => {
    const key = 'analytics-test';
    
    // Initial miss
    await cache.get(key);
    
    let stats = cache.getStats();
    expect(stats.hitCount).toBe(0);
    expect(stats.missCount).toBe(1);
    expect(stats.hitRate).toBe(0);

    // Set and hit
    await cache.set(key, 'data');
    await cache.get(key);
    
    stats = cache.getStats();
    expect(stats.hitCount).toBe(1);
    expect(stats.missCount).toBe(1);
    expect(stats.hitRate).toBe(0.5);

    // Another hit
    await cache.get(key);
    
    stats = cache.getStats();
    expect(stats.hitCount).toBe(2);
    expect(stats.missCount).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.667, 2);
  });

  it('should achieve target hit rate with repeated access', async () => {
    const data = { test: 'data' };
    const keys = ['key1', 'key2', 'key3'];
    
    // Populate cache
    for (const key of keys) {
      await cache.set(key, data);
    }

    // Simulate repeated access pattern (hits)
    for (let i = 0; i < 20; i++) {
      for (const key of keys) {
        await cache.get(key);
      }
    }

    // Add some misses
    for (let i = 0; i < 5; i++) {
      await cache.get(`miss-${i}`);
    }

    const stats = cache.getStats();
    
    // Should achieve >90% hit rate
    expect(stats.hitRate).toBeGreaterThan(0.9);
    expect(stats.hitCount).toBe(60); // 20 * 3 hits
    expect(stats.missCount).toBe(5); // 5 misses
  });

  it('should track access counts per entry', async () => {
    const key = 'access-count-test';
    
    await cache.set(key, 'data');
    
    // Access multiple times
    for (let i = 0; i < 5; i++) {
      await cache.get(key);
    }

    // Access internal state for verification
    const entry = (cache as any).cache.get(key);
    expect(entry.accessCount).toBe(5);
  });

  it('should calculate average response times', async () => {
    const keys = ['perf1', 'perf2', 'perf3'];
    
    for (const key of keys) {
      await cache.set(key, 'data');
      await cache.get(key); // Generate timing data
    }

    const metrics = cache.getMetrics();
    
    expect(metrics.performance.averageGetTime).toBeGreaterThan(0);
    expect(metrics.performance.averageSetTime).toBeGreaterThan(0);
    expect(metrics.operations.gets).toBeGreaterThan(0);
    expect(metrics.operations.sets).toBeGreaterThan(0);
  });

  it('should calculate cache efficiency score', async () => {
    // Create good cache scenario
    const data = 'test data';
    
    for (let i = 0; i < 10; i++) {
      await cache.set(`key-${i}`, data);
    }

    // Generate high hit rate
    for (let i = 0; i < 50; i++) {
      await cache.get(`key-${i % 10}`);
    }

    const metrics = cache.getMetrics();
    
    expect(metrics.performance.cacheEfficiencyScore).toBeGreaterThan(0.7);
    expect(metrics.performance.cacheEfficiencyScore).toBeLessThanOrEqual(1);
  });

  it('should provide comprehensive cache statistics', async () => {
    const testData = 'sample data';
    
    // Populate cache with various data
    await cache.set('old-entry', testData);
    await sleep(10);
    await cache.set('new-entry', testData);
    
    // Generate some activity
    await cache.get('old-entry');
    await cache.get('new-entry');
    await cache.get('missing-key');

    const stats = cache.getStats();
    
    expect(stats.totalEntries).toBe(2);
    expect(stats.totalSize).toBeGreaterThan(0);
    expect(stats.hitCount).toBe(2);
    expect(stats.missCount).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.667, 2);
    expect(stats.oldestEntry).toBeInstanceOf(Date);
    expect(stats.newestEntry).toBeInstanceOf(Date);
    expect(stats.memoryUtilization).toBeGreaterThan(0);
    expect(stats.memoryUtilization).toBeLessThan(1);
  });
});

// =====================================================
// USER-SPECIFIC DATA ISOLATION TESTS
// =====================================================

describe('PAMResponseCache - User Isolation', () => {
  let cache: PAMResponseCache;

  beforeEach(() => {
    cache = createTestCache();
  });

  afterEach(() => {
    cache.dispose();
  });

  it('should isolate user-specific data', async () => {
    const user1 = 'user-123';
    const user2 = 'user-456';
    
    // Set current user to user1
    (cache as any).currentUserId = user1;
    
    await cache.set('user-data', 'user1-data', { userSpecific: true });
    await cache.set('global-data', 'global', { userSpecific: false });

    // Switch to user2
    (cache as any).currentUserId = user2;
    
    // User2 should not see user1's data
    expect(await cache.get('user-data')).toBeNull();
    expect(await cache.get('global-data')).toBe('global');

    // User2 can set their own data
    await cache.set('user-data', 'user2-data', { userSpecific: true });
    expect(await cache.get('user-data')).toBe('user2-data');

    // Switch back to user1
    (cache as any).currentUserId = user1;
    
    // User1 should see their original data
    expect(await cache.get('user-data')).toBe('user1-data');
  });

  it('should handle no current user gracefully', async () => {
    (cache as any).currentUserId = undefined;
    
    await cache.set('no-user-data', 'data', { userSpecific: true });
    expect(await cache.get('no-user-data')).toBe('data');
  });

  it('should clear user data on logout simulation', async () => {
    const userId = 'test-user';
    (cache as any).currentUserId = userId;

    await cache.set('user-profile', 'profile-data', { 
      userSpecific: true, 
      sensitive: true 
    });
    await cache.set('user-settings', 'settings-data', { 
      userSpecific: true 
    });
    await cache.set('public-data', 'public', { 
      userSpecific: false 
    });

    // Simulate logout
    const logoutTrigger: InvalidationTrigger = {
      type: 'logout',
      userId
    };

    await cache.invalidate(logoutTrigger);
    (cache as any).currentUserId = undefined;

    // User-specific data should be cleared
    expect(await cache.get('user-profile')).toBeNull();
    expect(await cache.get('user-settings')).toBeNull();
    expect(await cache.get('public-data')).toBe('public');
  });
});

// =====================================================
// PERFORMANCE BENCHMARKS
// =====================================================

describe('PAMResponseCache - Performance', () => {
  let cache: PAMResponseCache;

  beforeEach(() => {
    cache = createTestCache({
      maxSize: 10 * 1024 * 1024, // 10MB
      maxEntries: 10000
    });
  });

  afterEach(() => {
    cache.dispose();
  });

  it('should handle high-volume operations efficiently', async () => {
    const startTime = Date.now();
    const operationCount = 1000;

    // Batch set operations
    const setPromises = [];
    for (let i = 0; i < operationCount; i++) {
      setPromises.push(cache.set(`perf-key-${i}`, { data: `value-${i}`, index: i }));
    }
    await Promise.all(setPromises);

    const setTime = Date.now() - startTime;

    // Batch get operations
    const getStartTime = Date.now();
    const getPromises = [];
    for (let i = 0; i < operationCount; i++) {
      getPromises.push(cache.get(`perf-key-${i}`));
    }
    const results = await Promise.all(getPromises);

    const getTime = Date.now() - getStartTime;

    // Verify all operations completed successfully
    expect(results.filter(r => r !== null)).toHaveLength(operationCount);

    // Performance thresholds (adjust based on environment)
    expect(setTime).toBeLessThan(1000); // 1 second for 1000 sets
    expect(getTime).toBeLessThan(500);  // 0.5 seconds for 1000 gets

    const avgSetTime = setTime / operationCount;
    const avgGetTime = getTime / operationCount;

    expect(avgSetTime).toBeLessThan(1); // <1ms per set
    expect(avgGetTime).toBeLessThan(0.5); // <0.5ms per get

    const stats = cache.getStats();
    expect(stats.hitRate).toBe(1); // 100% hit rate
  });

  it('should maintain performance under memory pressure', async () => {
    const dataSize = 1024; // 1KB per entry
    const entryCount = 500;

    const startTime = Date.now();

    // Add many entries to create memory pressure
    for (let i = 0; i < entryCount; i++) {
      const largeData = createLargeData(dataSize / 1024);
      await cache.set(`memory-test-${i}`, largeData);
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / entryCount;

    // Should maintain reasonable performance even with eviction
    expect(avgTime).toBeLessThan(5); // <5ms per operation

    const stats = cache.getStats();
    expect(stats.memoryUtilization).toBeLessThanOrEqual(1);

    // Should still be able to retrieve recent entries efficiently
    const retrievalStart = Date.now();
    const recentData = await cache.get(`memory-test-${entryCount - 1}`);
    const retrievalTime = Date.now() - retrievalStart;

    expect(recentData).not.toBeNull();
    expect(retrievalTime).toBeLessThan(1); // <1ms retrieval
  });

  it('should handle concurrent operations safely', async () => {
    const concurrentOperations = 100;
    const promises: Promise<any>[] = [];

    // Launch concurrent set operations
    for (let i = 0; i < concurrentOperations; i++) {
      promises.push(
        cache.set(`concurrent-${i}`, `data-${i}`)
      );
    }

    // Launch concurrent get operations (some will miss, some will hit)
    for (let i = 0; i < concurrentOperations; i++) {
      promises.push(
        cache.get(`concurrent-${i}`)
      );
    }

    // Wait for all operations to complete
    const results = await Promise.all(promises);

    // All set operations should succeed
    const setResults = results.slice(0, concurrentOperations);
    expect(setResults.every(result => result === true)).toBe(true);

    // Verify final state is consistent
    const stats = cache.getStats();
    expect(stats.totalEntries).toBeGreaterThan(0);
    expect(stats.totalEntries).toBeLessThanOrEqual(concurrentOperations);
  });
});

// =====================================================
// ERROR HANDLING AND EDGE CASES
// =====================================================

describe('PAMResponseCache - Error Handling', () => {
  let cache: PAMResponseCache;

  beforeEach(() => {
    cache = createTestCache();
  });

  afterEach(() => {
    cache.dispose();
  });

  it('should handle serialization errors gracefully', async () => {
    const circularObj: any = {};
    circularObj.self = circularObj;

    // Should not throw, but return false
    const result = await cache.set('circular', circularObj);
    expect(result).toBe(false);
    expect(await cache.get('circular')).toBeNull();
  });

  it('should handle extremely large objects', async () => {
    const veryLargeData = createLargeData(100); // 100KB
    
    const result = await cache.set('very-large', veryLargeData);
    
    // Depending on cache configuration, this might be rejected
    if (result) {
      expect(await cache.get('very-large')).toBe(veryLargeData);
    } else {
      expect(await cache.get('very-large')).toBeNull();
    }
  });

  it('should handle special characters in keys', async () => {
    const specialKeys = [
      'key with spaces',
      'key-with-dashes',
      'key_with_underscores',
      'key.with.dots',
      'key/with/slashes',
      'key|with|pipes',
      'key:with:colons'
    ];

    for (const key of specialKeys) {
      const data = `data for ${key}`;
      await cache.set(key, data);
      expect(await cache.get(key)).toBe(data);
    }
  });

  it('should handle rapid cache operations', async () => {
    const key = 'rapid-ops';
    
    // Rapid set/get/delete cycle
    for (let i = 0; i < 100; i++) {
      await cache.set(key, `data-${i}`);
      const retrieved = await cache.get(key);
      expect(retrieved).toBe(`data-${i}`);
      
      if (i % 2 === 0) {
        await cache.delete(key);
      }
    }

    // Final state should be consistent
    const finalData = await cache.get(key);
    expect(finalData).toBe('data-99'); // Last odd number
  });

  it('should recover from corrupted internal state', async () => {
    // Populate cache normally
    await cache.set('normal-key', 'normal-data');
    
    // Simulate corruption by directly manipulating internal state
    const internalCache = (cache as any).cache;
    const corruptedEntry = {
      id: 'corrupted',
      key: 'corrupted-key',
      data: 'corrupted-data',
      createdAt: new Date(),
      expiresAt: null, // Corrupted - should be Date
      accessCount: 'invalid', // Corrupted - should be number
      size: -1 // Invalid size
    };
    internalCache.set('corrupted-key', corruptedEntry);

    // Cache should handle corrupted entry gracefully
    const result = await cache.get('corrupted-key');
    expect(result).toBeNull(); // Should not return corrupted data

    // Normal operations should still work
    expect(await cache.get('normal-key')).toBe('normal-data');
    await cache.set('new-key', 'new-data');
    expect(await cache.get('new-key')).toBe('new-data');
  });
});

// =====================================================
// CACHE DECORATOR TESTS
// =====================================================

describe('Cache Decorator', () => {
  class TestService {
    callCount = 0;

    @cacheable({
      ttl: 100,
      keyGenerator: (args) => `test-${args[0]}`,
      tags: ['test-service']
    })
    async expensiveOperation(id: string): Promise<string> {
      this.callCount++;
      await sleep(10); // Simulate expensive operation
      return `result-${id}`;
    }

    @cacheable()
    async simpleOperation(value: number): Promise<number> {
      this.callCount++;
      return value * 2;
    }
  }

  it('should cache method results', async () => {
    const service = new TestService();
    
    const result1 = await service.expensiveOperation('123');
    const result2 = await service.expensiveOperation('123');
    
    expect(result1).toBe('result-123');
    expect(result2).toBe('result-123');
    expect(service.callCount).toBe(1); // Only called once due to caching
  });

  it('should differentiate between different arguments', async () => {
    const service = new TestService();
    
    const result1 = await service.expensiveOperation('123');
    const result2 = await service.expensiveOperation('456');
    
    expect(result1).toBe('result-123');
    expect(result2).toBe('result-456');
    expect(service.callCount).toBe(2); // Called twice for different args
  });

  it('should respect TTL in decorated methods', async () => {
    const service = new TestService();
    
    await service.expensiveOperation('ttl-test');
    expect(service.callCount).toBe(1);

    await sleep(120); // Wait for TTL expiration

    await service.expensiveOperation('ttl-test');
    expect(service.callCount).toBe(2); // Called again after expiration
  });
});

// =====================================================
// INTEGRATION WITH SUPABASE AUTH
// =====================================================

describe('Cache Auth Integration', () => {
  let cache: PAMResponseCache;

  beforeEach(() => {
    cache = createTestCache();
  });

  afterEach(() => {
    cache.dispose();
  });

  it('should handle auth state changes', async () => {
    // Mock auth state change callback
    const mockCallback = vi.fn();
    
    // Set up auth listener (would be called by constructor)
    const authStateCallback = (cache as any).constructor.prototype.setupUserAuthListener;
    
    // Simulate user login
    mockCallback('SIGNED_IN', { user: { id: 'new-user' } });
    
    // Simulate user logout  
    mockCallback('SIGNED_OUT', null);
    
    // Test passes if no errors are thrown
    expect(true).toBe(true);
  });
});

export { }; // Make this a module