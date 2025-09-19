/**
 * Error Handling Utilities with Exponential Backoff
 * Prevents excessive failed requests and improves user experience
 */

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

interface ErrorCacheEntry {
  count: number;
  lastError: Date;
  nextRetryTime: Date;
}

// Cache to track errors per operation to prevent spam
const errorCache = new Map<string, ErrorCacheEntry>();

// Default retry configurations for different error types
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2
};

const RLS_ERROR_CONFIG: RetryConfig = {
  maxRetries: 1, // Don't retry RLS errors much - they're permission issues
  baseDelay: 5000, // 5 seconds
  maxDelay: 60000, // 1 minute
  backoffFactor: 3
};

const NETWORK_ERROR_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelay: 2000, // 2 seconds
  maxDelay: 120000, // 2 minutes
  backoffFactor: 2.5
};

/**
 * Classify error types for appropriate handling
 */
export enum ErrorType {
  RLS_PERMISSION = 'rls_permission',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

/**
 * Classify error based on error code and message
 */
export function classifyError(error: any): ErrorType {
  if (!error) return ErrorType.UNKNOWN;

  // PostgreSQL RLS permission denied
  if (error.code === '42501' || error.message?.includes('permission denied')) {
    return ErrorType.RLS_PERMISSION;
  }

  // Authentication errors
  if (error.code === 401 || error.message?.includes('unauthorized') || error.message?.includes('token')) {
    return ErrorType.AUTHENTICATION;
  }

  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch') || error.message?.includes('network')) {
    return ErrorType.NETWORK;
  }

  // Validation errors
  if (error.code === 400 || error.code === '400' || error.message?.includes('validation')) {
    return ErrorType.VALIDATION;
  }

  // Server errors
  if (error.code >= 500 || error.message?.includes('internal server error')) {
    return ErrorType.SERVER;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get retry configuration based on error type
 */
function getRetryConfig(errorType: ErrorType): RetryConfig {
  switch (errorType) {
    case ErrorType.RLS_PERMISSION:
      return RLS_ERROR_CONFIG;
    case ErrorType.NETWORK:
    case ErrorType.SERVER:
      return NETWORK_ERROR_CONFIG;
    case ErrorType.AUTHENTICATION:
      return { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 };
    case ErrorType.VALIDATION:
      return { ...DEFAULT_RETRY_CONFIG, maxRetries: 1 }; // Don't retry validation errors much
    default:
      return DEFAULT_RETRY_CONFIG;
  }
}

/**
 * Check if we should retry an operation based on error cache
 */
export function shouldRetry(operationKey: string, error: any): boolean {
  const errorType = classifyError(error);
  const config = getRetryConfig(errorType);
  const now = new Date();

  const cached = errorCache.get(operationKey);

  if (!cached) {
    // First error - allow retry
    errorCache.set(operationKey, {
      count: 1,
      lastError: now,
      nextRetryTime: new Date(now.getTime() + config.baseDelay)
    });
    return true;
  }

  // Check if we're still in backoff period
  if (now < cached.nextRetryTime) {
    console.debug(`🔄 Operation ${operationKey} still in backoff period until ${cached.nextRetryTime.toISOString()}`);
    return false;
  }

  // Check if we've exceeded max retries
  if (cached.count >= config.maxRetries) {
    console.warn(`❌ Operation ${operationKey} exceeded max retries (${config.maxRetries})`);
    return false;
  }

  // Calculate next retry time with exponential backoff
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffFactor, cached.count),
    config.maxDelay
  );

  // Update cache
  errorCache.set(operationKey, {
    count: cached.count + 1,
    lastError: now,
    nextRetryTime: new Date(now.getTime() + delay)
  });

  console.debug(`🔄 Allowing retry ${cached.count + 1}/${config.maxRetries} for ${operationKey}, next attempt in ${delay}ms`);
  return true;
}

/**
 * Reset error cache for an operation (call on success)
 */
export function clearErrorCache(operationKey: string): void {
  errorCache.delete(operationKey);
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyMessage(error: any, context?: string): string {
  const errorType = classifyError(error);

  switch (errorType) {
    case ErrorType.RLS_PERMISSION:
      return `Access denied${context ? ` for ${context}` : ''}. Please check your permissions or contact support.`;

    case ErrorType.AUTHENTICATION:
      return 'Your session has expired. Please sign in again.';

    case ErrorType.NETWORK:
      return 'Connection problem. Please check your internet connection and try again.';

    case ErrorType.VALIDATION:
      return `Invalid data${context ? ` for ${context}` : ''}. Please check your input and try again.`;

    case ErrorType.SERVER:
      return 'Server error. Please try again in a few minutes.';

    default:
      return `Something went wrong${context ? ` with ${context}` : ''}. Please try again.`;
  }
}

/**
 * Enhanced error logging with context
 */
export function logError(error: any, context: string, userId?: string): void {
  const errorType = classifyError(error);
  const timestamp = new Date().toISOString();

  console.error(`[${timestamp}] ${errorType.toUpperCase()} ERROR in ${context}:`, {
    error: {
      message: error.message,
      code: error.code,
      details: error.details
    },
    context,
    userId,
    userAgent: navigator.userAgent,
    url: window.location.href
  });

  // In production, you might want to send this to an error tracking service
  if (import.meta.env.MODE === 'production' && window.gtag) {
    window.gtag('event', 'exception', {
      description: `${errorType}: ${error.message}`,
      fatal: errorType === ErrorType.RLS_PERMISSION
    });
  }
}

/**
 * Wrapper for database operations with automatic retry logic
 */
export async function withRetry<T>(
  operationKey: string,
  operation: () => Promise<T>,
  context: string,
  userId?: string
): Promise<T> {
  try {
    const result = await operation();
    clearErrorCache(operationKey);
    return result;
  } catch (error) {
    logError(error, context, userId);

    if (shouldRetry(operationKey, error)) {
      console.debug(`🔄 Will retry operation ${operationKey} after backoff period`);
      throw error; // Let caller handle retry timing
    } else {
      console.warn(`🛑 Stopping retries for operation ${operationKey}`);
      throw new Error(getUserFriendlyMessage(error, context));
    }
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  const errorType = classifyError(error);

  // RLS permission errors are usually not retryable (they're policy issues)
  // Validation errors are not retryable (bad data)
  return ![ErrorType.RLS_PERMISSION, ErrorType.VALIDATION].includes(errorType);
}

/**
 * Get error cache statistics for debugging
 */
export function getErrorCacheStats(): Record<string, any> {
  const stats: Record<string, any> = {};

  for (const [key, entry] of errorCache.entries()) {
    stats[key] = {
      errorCount: entry.count,
      lastError: entry.lastError.toISOString(),
      nextRetryTime: entry.nextRetryTime.toISOString(),
      inBackoff: new Date() < entry.nextRetryTime
    };
  }

  return stats;
}