/**
 * Comprehensive Supabase Error Handler
 *
 * PURPOSE: Prevent recurring HTML response issues by:
 * 1. Detecting and categorizing common Supabase errors
 * 2. Implementing retry logic for transient issues
 * 3. Providing detailed logging for debugging
 * 4. Graceful fallback handling
 */

import { toast } from "sonner";

export interface SupabaseErrorInfo {
  type: 'html_response' | 'network_error' | 'auth_error' | 'rate_limit' | 'server_error' | 'unknown';
  isRetryable: boolean;
  message: string;
  originalError: any;
}

export function analyzeSupabaseError(error: any): SupabaseErrorInfo {
  if (!error) {
    return {
      type: 'unknown',
      isRetryable: false,
      message: 'No error object provided',
      originalError: error
    };
  }

  const errorMessage = error.message || error.toString();

  // HTML Response Error (most common recurring issue)
  if (errorMessage.includes('Unexpected token \'<\'') ||
      errorMessage.includes('<!doctype') ||
      errorMessage.includes('<!DOCTYPE')) {
    return {
      type: 'html_response',
      isRetryable: true,
      message: 'Server returned HTML instead of JSON - likely network/proxy redirect',
      originalError: error
    };
  }

  // Network/CORS errors
  if (errorMessage.includes('CORS') ||
      errorMessage.includes('Network Error') ||
      errorMessage.includes('Failed to fetch')) {
    return {
      type: 'network_error',
      isRetryable: true,
      message: 'Network connectivity issue',
      originalError: error
    };
  }

  // Authentication errors
  if (errorMessage.includes('JWT') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('authentication') ||
      error.code === 'PGRST301') {
    return {
      type: 'auth_error',
      isRetryable: false,
      message: 'Authentication issue - token may be expired',
      originalError: error
    };
  }

  // Rate limiting
  if (errorMessage.includes('rate limit') ||
      errorMessage.includes('429') ||
      errorMessage.includes('Too Many Requests')) {
    return {
      type: 'rate_limit',
      isRetryable: true,
      message: 'Rate limit exceeded - too many requests',
      originalError: error
    };
  }

  // Server errors
  if (errorMessage.includes('500') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504')) {
    return {
      type: 'server_error',
      isRetryable: true,
      message: 'Server error - Supabase infrastructure issue',
      originalError: error
    };
  }

  return {
    type: 'unknown',
    isRetryable: false,
    message: errorMessage,
    originalError: error
  };
}

// Mobile-specific retry with longer timeouts for slow networks
export async function executeWithRetryMobile<T>(
  operation: () => Promise<T>,
  context: string,
  timeoutMs: number = 10000, // 10s for mobile networks
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<T> {
  const executeWithTimeout = async (): Promise<T> => {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Mobile timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  };

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`📱 ${context} - Mobile attempt ${attempt}/${maxRetries + 1} (${timeoutMs}ms timeout)`);
      const result = await executeWithTimeout();

      if (attempt > 1) {
        console.log(`✅ ${context} - Mobile retry succeeded on attempt ${attempt}`);
        toast.success(`${context} succeeded after mobile retry`);
      }

      return result;
    } catch (error) {
      lastError = error;
      const errorInfo = analyzeSupabaseError(error);

      console.warn(`⚠️ ${context} - Mobile attempt ${attempt} failed:`, {
        type: errorInfo.type,
        message: errorInfo.message,
        isRetryable: errorInfo.isRetryable,
        isMobileTimeout: String(error).includes('Mobile timeout'),
        error: error
      });

      // Don't retry if we've exceeded max attempts or error is not retryable (unless it's a mobile timeout)
      const isMobileTimeout = String(error).includes('Mobile timeout');
      if (attempt > maxRetries || (!errorInfo.isRetryable && !isMobileTimeout)) {
        break;
      }

      // Wait before retry with longer delays for mobile
      const delay = delayMs * Math.pow(2, attempt - 1);
      console.log(`⏱️ ${context} - Mobile waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All attempts failed
  const errorInfo = analyzeSupabaseError(lastError);
  console.error(`❌ ${context} - All mobile attempts failed:`, {
    type: errorInfo.type,
    message: errorInfo.message,
    finalError: lastError
  });

  throw lastError;
}

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`🔄 ${context} - Attempt ${attempt}/${maxRetries + 1}`);
      const result = await operation();

      if (attempt > 1) {
        console.log(`✅ ${context} - Succeeded on retry attempt ${attempt}`);
        toast.success(`${context} succeeded after retry`);
      }

      return result;
    } catch (error) {
      lastError = error;
      const errorInfo = analyzeSupabaseError(error);

      console.warn(`⚠️ ${context} - Attempt ${attempt} failed:`, {
        type: errorInfo.type,
        message: errorInfo.message,
        isRetryable: errorInfo.isRetryable,
        error: error
      });

      // Don't retry if we've exceeded max attempts or error is not retryable
      if (attempt > maxRetries || !errorInfo.isRetryable) {
        break;
      }

      // Wait before retry (exponential backoff)
      const delay = delayMs * Math.pow(2, attempt - 1);
      console.log(`⏱️ ${context} - Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All attempts failed
  const errorInfo = analyzeSupabaseError(lastError);
  console.error(`❌ ${context} - All attempts failed:`, {
    type: errorInfo.type,
    message: errorInfo.message,
    finalError: lastError
  });

  throw lastError;
}

export function handleSupabaseResponse<T>(
  response: { data: T | null; error: any },
  context: string,
  assumeSuccessOnHtml: boolean = false
): { success: boolean; data: T | null; shouldRetry: boolean } {
  const { data, error } = response;

  if (!error) {
    return { success: true, data, shouldRetry: false };
  }

  const errorInfo = analyzeSupabaseError(error);

  // Special handling for HTML responses (the recurring issue)
  if (errorInfo.type === 'html_response' && assumeSuccessOnHtml) {
    console.warn(`🟡 ${context} - HTML response received, assuming success`);
    return { success: true, data, shouldRetry: false };
  }

  console.error(`❌ ${context} - Error:`, {
    type: errorInfo.type,
    message: errorInfo.message,
    isRetryable: errorInfo.isRetryable
  });

  return {
    success: false,
    data: null,
    shouldRetry: errorInfo.isRetryable
  };
}

// Health check function to monitor Supabase connectivity
export async function checkSupabaseHealth(supabase: any): Promise<boolean> {
  try {
    console.log('🏥 Checking Supabase health...');

    // Simple query that should always work
    const { error } = await supabase
      .from('profiles')
      .select('count(*)')
      .limit(1);

    if (error) {
      const errorInfo = analyzeSupabaseError(error);
      console.warn('🟡 Supabase health check failed:', errorInfo);
      return false;
    }

    console.log('✅ Supabase health check passed');
    return true;
  } catch (error) {
    console.error('❌ Supabase health check error:', error);
    return false;
  }
}