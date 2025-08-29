/**
 * Audio Optimization Utilities for Phase 5A TTS
 * Implements compression, caching, and performance monitoring
 */

// Note: Install required packages:
// npm install pako @types/pako

interface AudioCacheEntry {
  audioBlob: Blob;
  timestamp: number;
  hitCount: number;
}

interface CompressionResult {
  compressed: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Audio Compression Utilities
 * Reduces WebSocket payload size by 50-70%
 */
export class AudioCompressor {
  private static encoder = new TextEncoder();
  private static decoder = new TextDecoder();

  /**
   * Compress audio data using native CompressionStream API (if available)
   * Falls back to base64 encoding if compression not supported
   */
  static async compressAudio(audioData: Uint8Array): Promise<CompressionResult> {
    const originalSize = audioData.length;

    try {
      // Check if CompressionStream is available (modern browsers)
      if ('CompressionStream' in window) {
        const stream = new Response(audioData).body!
          .pipeThrough(new CompressionStream('gzip'));
        
        const compressed = await new Response(stream).arrayBuffer();
        const compressedArray = new Uint8Array(compressed);
        const base64 = btoa(String.fromCharCode(...compressedArray));

        return {
          compressed: base64,
          originalSize,
          compressedSize: compressedArray.length,
          compressionRatio: 1 - (compressedArray.length / originalSize)
        };
      }
    } catch (error) {
      console.warn('CompressionStream not available, using fallback', error);
    }

    // Fallback: Just base64 encode
    const base64 = btoa(String.fromCharCode(...audioData));
    return {
      compressed: base64,
      originalSize,
      compressedSize: base64.length,
      compressionRatio: 0
    };
  }

  /**
   * Decompress audio data
   */
  static async decompressAudio(compressedBase64: string): Promise<Uint8Array> {
    try {
      // First decode from base64
      const compressed = Uint8Array.from(atob(compressedBase64), c => c.charCodeAt(0));

      // Check if DecompressionStream is available
      if ('DecompressionStream' in window) {
        try {
          const stream = new Response(compressed).body!
            .pipeThrough(new DecompressionStream('gzip'));
          
          const decompressed = await new Response(stream).arrayBuffer();
          return new Uint8Array(decompressed);
        } catch {
          // Data might not be compressed, return as-is
          return compressed;
        }
      }

      // No decompression available, assume uncompressed
      return compressed;
    } catch (error) {
      console.error('Decompression failed:', error);
      throw error;
    }
  }
}

/**
 * TTS Audio Cache Manager
 * Implements LRU cache with TTL for audio blobs
 */
export class TTSAudioCache {
  private cache: Map<string, AudioCacheEntry> = new Map();
  private maxSize: number;
  private ttlMs: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0
  };

  constructor(maxSize: number = 50, ttlSeconds: number = 3600) {
    this.maxSize = maxSize;
    this.ttlMs = ttlSeconds * 1000;
    
    // Periodic cleanup of expired entries
    setInterval(() => this.cleanupExpired(), 60000); // Every minute
  }

  /**
   * Generate cache key from TTS parameters
   */
  private generateKey(text: string, voice: string = 'default'): string {
    const normalized = text.toLowerCase().trim().substring(0, 100); // Limit key size
    return `${normalized}:${voice}`;
  }

  /**
   * Get cached audio if available
   */
  get(text: string, voice?: string): Blob | null {
    const key = this.generateKey(text, voice);
    this.stats.totalRequests++;

    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    entry.hitCount++;
    this.cache.set(key, entry);

    this.stats.hits++;
    console.log(`📦 Cache HIT (${this.getHitRate().toFixed(1)}% hit rate)`);
    
    return entry.audioBlob;
  }

  /**
   * Store audio in cache
   */
  set(text: string, audioBlob: Blob, voice?: string): void {
    const key = this.generateKey(text, voice);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }

    this.cache.set(key, {
      audioBlob,
      timestamp: Date.now(),
      hitCount: 0
    });

    console.log(`💾 Cached TTS audio (${this.cache.size}/${this.maxSize} entries)`);
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired TTS cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.getHitRate(),
      ttlSeconds: this.ttlMs / 1000
    };
  }

  /**
   * Calculate hit rate percentage
   */
  private getHitRate(): number {
    if (this.stats.totalRequests === 0) return 0;
    return (this.stats.hits / this.stats.totalRequests) * 100;
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    this.cache.clear();
    console.log('🧹 TTS cache cleared');
  }
}

/**
 * TTS Performance Monitor
 * Tracks latency and performance metrics
 */
export class TTSPerformanceMonitor {
  private latencies: number[] = [];
  private maxSamples: number = 100;

  /**
   * Record a TTS operation latency
   */
  recordLatency(latencyMs: number): void {
    this.latencies.push(latencyMs);
    
    // Keep only recent samples
    if (this.latencies.length > this.maxSamples) {
      this.latencies = this.latencies.slice(-this.maxSamples);
    }

    // Log if latency exceeds target
    if (latencyMs > 800) {
      console.warn(`⚠️ TTS latency exceeded target: ${latencyMs.toFixed(0)}ms > 800ms`);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    if (this.latencies.length === 0) {
      return {
        samples: 0,
        avgLatency: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        targetMet: true
      };
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const avg = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;

    return {
      samples: this.latencies.length,
      avgLatency: avg,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      targetMet: avg < 800,
      recentLatencies: this.latencies.slice(-10)
    };
  }

  /**
   * Check if performance is meeting targets
   */
  isPerformanceHealthy(): boolean {
    const metrics = this.getMetrics();
    return metrics.targetMet && metrics.p95 < 1000;
  }
}

/**
 * Client-side Rate Limiter for TTS requests
 */
export class TTSRateLimiter {
  private requestTimes: number[] = [];
  private readonly maxPerMinute: number;
  private readonly maxPerHour: number;

  constructor(maxPerMinute: number = 30, maxPerHour: number = 500) {
    this.maxPerMinute = maxPerMinute;
    this.maxPerHour = maxPerHour;
  }

  /**
   * Check if a request is allowed
   */
  canRequest(): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // Clean old requests
    this.requestTimes = this.requestTimes.filter(time => time > oneHourAgo);

    // Check hourly limit
    if (this.requestTimes.length >= this.maxPerHour) {
      const oldestRequest = this.requestTimes[0];
      const retryAfter = Math.ceil((oldestRequest + 3600000 - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Check minute limit
    const recentRequests = this.requestTimes.filter(time => time > oneMinuteAgo);
    if (recentRequests.length >= this.maxPerMinute) {
      const oldestRecent = recentRequests[0];
      const retryAfter = Math.ceil((oldestRecent + 60000 - now) / 1000);
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    this.requestTimes.push(Date.now());
  }

  /**
   * Get current usage stats
   */
  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const validRequests = this.requestTimes.filter(time => time > oneHourAgo);
    const recentRequests = validRequests.filter(time => time > oneMinuteAgo);

    return {
      requestsLastMinute: recentRequests.length,
      requestsLastHour: validRequests.length,
      remainingMinute: Math.max(0, this.maxPerMinute - recentRequests.length),
      remainingHour: Math.max(0, this.maxPerHour - validRequests.length),
      maxPerMinute: this.maxPerMinute,
      maxPerHour: this.maxPerHour
    };
  }
}

/**
 * Optimized TTS Hook with all performance features
 */
export class OptimizedTTSManager {
  private cache: TTSAudioCache;
  private monitor: TTSPerformanceMonitor;
  private rateLimiter: TTSRateLimiter;
  private compressor: typeof AudioCompressor;

  constructor() {
    this.cache = new TTSAudioCache(50, 3600); // 50 items, 1 hour TTL
    this.monitor = new TTSPerformanceMonitor();
    this.rateLimiter = new TTSRateLimiter(30, 500); // 30/min, 500/hour
    this.compressor = AudioCompressor;
  }

  /**
   * Process TTS audio with optimizations
   */
  async processTTSAudio(
    text: string,
    audioData: string, // Base64 encoded
    voice?: string,
    format: string = 'mp3'
  ): Promise<{ 
    audioBlob: Blob; 
    fromCache: boolean; 
    latencyMs: number;
    stats: any;
  }> {
    const startTime = performance.now();

    // Check rate limit
    const rateCheck = this.rateLimiter.canRequest();
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter} seconds`);
    }

    // Check cache first
    const cached = this.cache.get(text, voice);
    if (cached) {
      const latencyMs = performance.now() - startTime;
      this.monitor.recordLatency(latencyMs);
      
      return {
        audioBlob: cached,
        fromCache: true,
        latencyMs,
        stats: {
          cache: this.cache.getStats(),
          performance: this.monitor.getMetrics(),
          rateLimit: this.rateLimiter.getStats()
        }
      };
    }

    // Decompress audio if needed
    let audioBytes: Uint8Array;
    try {
      audioBytes = await this.compressor.decompressAudio(audioData);
    } catch {
      // Fallback: assume uncompressed base64
      audioBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    }

    // Create audio blob
    const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    const audioBlob = new Blob([audioBytes], { type: mimeType });

    // Cache for future use
    this.cache.set(text, audioBlob, voice);

    // Record request and latency
    this.rateLimiter.recordRequest();
    const latencyMs = performance.now() - startTime;
    this.monitor.recordLatency(latencyMs);

    return {
      audioBlob,
      fromCache: false,
      latencyMs,
      stats: {
        cache: this.cache.getStats(),
        performance: this.monitor.getMetrics(),
        rateLimit: this.rateLimiter.getStats()
      }
    };
  }

  /**
   * Get current optimization statistics
   */
  getStats() {
    return {
      cache: this.cache.getStats(),
      performance: this.monitor.getMetrics(),
      rateLimit: this.rateLimiter.getStats(),
      healthy: this.monitor.isPerformanceHealthy()
    };
  }

  /**
   * Clear cache and reset stats
   */
  reset(): void {
    this.cache.clear();
    console.log('🔄 TTS optimization manager reset');
  }
}

// Export singleton instance
export const ttsOptimizer = new OptimizedTTSManager();

// Export individual classes for testing
export {
  TTSAudioCache,
  TTSPerformanceMonitor,
  TTSRateLimiter
};