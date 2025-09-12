import { RateLimiter, RateLimitEntry } from './types.js';

export class TokenBucketRateLimiter implements RateLimiter {
  private buckets = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(identifier);

    if (!bucket) {
      // First request for this identifier
      this.buckets.set(identifier, {
        count: 1,
        windowStart: now,
      });
      return true;
    }

    // Check if we need to reset the window
    if (now - bucket.windowStart >= this.windowMs) {
      bucket.count = 1;
      bucket.windowStart = now;
      return true;
    }

    // Check if we're within the rate limit
    if (bucket.count < this.maxRequests) {
      bucket.count++;
      return true;
    }

    return false;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [identifier, bucket] of this.buckets.entries()) {
      if (now - bucket.windowStart >= this.windowMs) {
        this.buckets.delete(identifier);
      }
    }
  }

  getStats(): { activeIdentifiers: number; totalBuckets: number } {
    return {
      activeIdentifiers: this.buckets.size,
      totalBuckets: this.buckets.size,
    };
  }
}