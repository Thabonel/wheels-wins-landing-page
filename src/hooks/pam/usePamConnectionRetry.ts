/**
 * PAM Connection Retry Hook - Enhanced Exponential Backoff
 * Day 2 Hour 2: Connection retry with exponential backoff and timeout handling
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  timeout?: number;
  jitter?: boolean;
}

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  nextRetryIn: number;
  lastError: string | null;
  hasExceededMaxRetries: boolean;
}

interface RetryActions {
  retry: () => Promise<void>;
  resetRetries: () => void;
  cancel: () => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  timeout: 30000, // 30 seconds per attempt
  jitter: true
};

export function usePamConnectionRetry(
  connectFunction: () => Promise<void>,
  config: RetryConfig = {}
): [RetryState, RetryActions] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    nextRetryIn: 0,
    lastError: null,
    hasExceededMaxRetries: false
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const calculateDelay = useCallback((retryCount: number): number => {
    const { baseDelay, maxDelay, backoffFactor, jitter } = finalConfig;

    // Exponential backoff: baseDelay * (backoffFactor ^ retryCount)
    let delay = baseDelay * Math.pow(backoffFactor, retryCount);

    // Cap at maxDelay
    delay = Math.min(delay, maxDelay);

    // Add jitter to prevent thundering herd
    if (jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.round(delay);
  }, [finalConfig]);

  const startCountdown = useCallback((delay: number) => {
    setState(prev => ({ ...prev, nextRetryIn: delay }));

    countdownRef.current = setInterval(() => {
      setState(prev => {
        const newTime = prev.nextRetryIn - 1000;
        return { ...prev, nextRetryIn: Math.max(0, newTime) };
      });
    }, 1000);
  }, []);

  const clearTimers = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const executeWithTimeout = useCallback(async (fn: () => Promise<void>, timeoutMs: number): Promise<void> => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeout = setTimeout(() => {
        abortController.abort();
        reject(new Error(`Connection attempt timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      abortController.signal.addEventListener('abort', () => {
        clearTimeout(timeout);
      });
    });

    try {
      await Promise.race([fn(), timeoutPromise]);
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  const retry = useCallback(async () => {
    const { maxRetries, timeout } = finalConfig;

    if (state.hasExceededMaxRetries || state.isRetrying) {
      return;
    }

    const currentRetryCount = state.retryCount;

    // Check if we've exceeded max retries
    if (currentRetryCount >= maxRetries) {
      setState(prev => ({
        ...prev,
        hasExceededMaxRetries: true,
        isRetrying: false
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isRetrying: true,
      lastError: null,
      nextRetryIn: 0
    }));

    try {
      // Execute the connection function with timeout
      await executeWithTimeout(connectFunction, timeout);

      // Success - reset everything
      setState({
        isRetrying: false,
        retryCount: 0,
        nextRetryIn: 0,
        lastError: null,
        hasExceededMaxRetries: false
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      const newRetryCount = currentRetryCount + 1;

      console.error(`PAM connection attempt ${newRetryCount} failed:`, error);

      if (newRetryCount >= maxRetries) {
        setState(prev => ({
          ...prev,
          isRetrying: false,
          retryCount: newRetryCount,
          lastError: errorMessage,
          hasExceededMaxRetries: true,
          nextRetryIn: 0
        }));
        return;
      }

      const delay = calculateDelay(newRetryCount);

      setState(prev => ({
        ...prev,
        isRetrying: false,
        retryCount: newRetryCount,
        lastError: errorMessage,
        nextRetryIn: delay
      }));

      // Start countdown and schedule next retry
      startCountdown(delay);

      retryTimeoutRef.current = setTimeout(() => {
        clearTimers();
        retry(); // Recursive retry
      }, delay);
    }
  }, [state, finalConfig, connectFunction, calculateDelay, startCountdown, clearTimers, executeWithTimeout]);

  const resetRetries = useCallback(() => {
    clearTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState({
      isRetrying: false,
      retryCount: 0,
      nextRetryIn: 0,
      lastError: null,
      hasExceededMaxRetries: false
    });
  }, [clearTimers]);

  const cancel = useCallback(() => {
    clearTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({
      ...prev,
      isRetrying: false,
      nextRetryIn: 0
    }));
  }, [clearTimers]);

  return [
    state,
    {
      retry,
      resetRetries,
      cancel
    }
  ];
}

// Helper hook for specific PAM WebSocket retry logic
export function usePamWebSocketRetry(
  wsUrl: string,
  userId: string,
  token: string,
  onConnected?: () => void,
  onError?: (error: string) => void
) {
  const connectFunction = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(`${wsUrl}/${userId}?token=${token}`);

        ws.onopen = () => {
          ws.close(); // Close test connection
          if (onConnected) onConnected();
          resolve();
        };

        ws.onerror = (error) => {
          const errorMsg = 'WebSocket connection failed';
          if (onError) onError(errorMsg);
          reject(new Error(errorMsg));
        };

        ws.onclose = (event) => {
          if (event.code !== 1000) { // Not a normal closure
            const errorMsg = `WebSocket closed unexpectedly (code: ${event.code})`;
            if (onError) onError(errorMsg);
            reject(new Error(errorMsg));
          }
        };

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown WebSocket error';
        if (onError) onError(errorMsg);
        reject(error);
      }
    });
  }, [wsUrl, userId, token, onConnected, onError]);

  return usePamConnectionRetry(connectFunction, {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 16000,
    backoffFactor: 2,
    timeout: 10000, // 10 seconds for WebSocket connections
    jitter: true
  });
}

export default usePamConnectionRetry;