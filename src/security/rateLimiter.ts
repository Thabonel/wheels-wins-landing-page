/**
 * Client-side Rate Limiter for API Protection
 * Implements intelligent rate limiting to prevent abuse and improve UX
 */

interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
  keyGenerator?: (context?: any) => string;
  onLimitReached?: (key: string, retryAfter: number) => void;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequestTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: () => 'global',
      onLimitReached: () => {},
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed and increment counter
   */
  checkLimit(context?: any): { allowed: boolean; retryAfter?: number; remaining: number } {
    const key = this.config.keyGenerator(context);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.store.get(key);

    // Create new entry or reset if window expired
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 1,
        resetTime: now + this.config.windowMs,
        firstRequestTime: now
      };
      this.store.set(key, entry);

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      this.config.onLimitReached(key, retryAfter);

      return {
        allowed: false,
        retryAfter,
        remaining: 0
      };
    }

    // Increment counter
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count
    };
  }

  /**
   * Record request result (for conditional counting)
   */
  recordResult(success: boolean, context?: any): void {
    const key = this.config.keyGenerator(context);
    const entry = this.store.get(key);

    if (!entry) return;

    // Adjust count based on configuration
    if (success && this.config.skipSuccessfulRequests) {
      entry.count = Math.max(0, entry.count - 1);
    } else if (!success && this.config.skipFailedRequests) {
      entry.count = Math.max(0, entry.count - 1);
    }

    this.store.set(key, entry);
  }

  /**
   * Get current status for a key
   */
  getStatus(context?: any): { count: number; remaining: number; resetTime: number } {
    const key = this.config.keyGenerator(context);
    const entry = this.store.get(key);

    if (!entry || entry.resetTime <= Date.now()) {
      return {
        count: 0,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs
      };
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime
    };
  }

  /**
   * Reset limits for a specific key
   */
  reset(context?: any): void {
    const key = this.config.keyGenerator(context);
    this.store.delete(key);
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.debug(`Rate limiter cleaned up ${cleaned} expired entries`);
    }
  }
}

/**
 * Pre-configured rate limiters for different scenarios
 */

// General API rate limiter - 100 requests per minute
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyGenerator: () => 'api-general',
  onLimitReached: (key, retryAfter) => {
    console.warn(`API rate limit exceeded. Retry after ${retryAfter} seconds`);
  }
});

// Authentication rate limiter - 5 attempts per 15 minutes
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyGenerator: (email?: string) => `auth-${email || 'unknown'}`,
  onLimitReached: (key, retryAfter) => {
    console.warn(`Authentication rate limit exceeded for ${key}. Retry after ${retryAfter} seconds`);
  },
  skipSuccessfulRequests: true // Don't count successful logins against the limit
});

// Search rate limiter - 30 requests per minute
export const searchRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  keyGenerator: () => 'search',
  onLimitReached: (key, retryAfter) => {
    console.warn(`Search rate limit exceeded. Retry after ${retryAfter} seconds`);
  }
});

// File upload rate limiter - 10 uploads per 5 minutes
export const uploadRateLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10,
  keyGenerator: () => 'upload',
  onLimitReached: (key, retryAfter) => {
    console.warn(`Upload rate limit exceeded. Retry after ${retryAfter} seconds`);
  }
});

// PAM conversation rate limiter - 50 messages per hour
export const pamRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50,
  keyGenerator: (userId?: string) => `pam-${userId || 'anonymous'}`,
  onLimitReached: (key, retryAfter) => {
    console.warn(`PAM conversation rate limit exceeded. Retry after ${retryAfter} seconds`);
  }
});

/**
 * Rate-limited fetch wrapper
 */
export const rateLimitedFetch = async (
  url: string,
  options: RequestInit & { rateLimiter?: RateLimiter; context?: any } = {}
): Promise<Response> => {
  const { rateLimiter = apiRateLimiter, context, ...fetchOptions } = options;

  // Check rate limit before request
  const limitCheck = rateLimiter.checkLimit(context);

  if (!limitCheck.allowed) {
    const error = new Error(`Rate limit exceeded. Retry after ${limitCheck.retryAfter} seconds`);
    (error as any).status = 429;
    (error as any).retryAfter = limitCheck.retryAfter;
    throw error;
  }

  try {
    const response = await fetch(url, fetchOptions);

    // Record success/failure for conditional counting
    rateLimiter.recordResult(response.ok, context);

    return response;
  } catch (error) {
    // Record failure
    rateLimiter.recordResult(false, context);
    throw error;
  }
};

/**
 * Rate limiter middleware for React hooks
 */
export const useRateLimit = (limiter: RateLimiter, context?: any) => {
  const checkLimit = () => limiter.checkLimit(context);
  const getStatus = () => limiter.getStatus(context);
  const reset = () => limiter.reset(context);

  return {
    checkLimit,
    getStatus,
    reset,
    rateLimitedFetch: (url: string, options?: RequestInit) =>
      rateLimitedFetch(url, { ...options, rateLimiter: limiter, context })
  };
};

/**
 * Exponential backoff for rate-limited requests
 */
export const withExponentialBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's not a rate limit error
      if (error.status !== 429) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay: use server's retry-after if available, otherwise exponential backoff
      const retryAfter = error.retryAfter || Math.pow(2, attempt);
      const delay = Math.min(retryAfter * 1000, baseDelay * Math.pow(2, attempt));

      console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

export default RateLimiter;