/**
 * PAM Error Recovery Hook
 * Provides robust error handling and recovery mechanisms for PAM connections
 * Prevents error boundaries from crashing the entire application
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PamError {
  type: 'websocket' | 'cors' | 'auth' | 'database' | 'network' | 'unknown';
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

export interface ErrorRecoveryState {
  lastError: PamError | null;
  errorCount: number;
  isRecovering: boolean;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  backoffTime: number;
  circuitBreakerOpen: boolean;
}

export interface ErrorRecoveryActions {
  reportError: (error: any, type?: PamError['type']) => void;
  attemptRecovery: () => Promise<boolean>;
  clearErrors: () => void;
  isInRecoveryMode: () => boolean;
  getRecoveryMessage: () => string;
}

const MAX_RECOVERY_ATTEMPTS = 3;
const BASE_BACKOFF_TIME = 1000; // 1 second
const MAX_BACKOFF_TIME = 30000; // 30 seconds
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

export function usePamErrorRecovery(): ErrorRecoveryState & ErrorRecoveryActions {
  const [state, setState] = useState<ErrorRecoveryState>({
    lastError: null,
    errorCount: 0,
    isRecovering: false,
    recoveryAttempts: 0,
    maxRecoveryAttempts: MAX_RECOVERY_ATTEMPTS,
    backoffTime: BASE_BACKOFF_TIME,
    circuitBreakerOpen: false,
  });

  const recoveryTimeoutRef = useRef<NodeJS.Timeout>();
  const circuitBreakerTimeoutRef = useRef<NodeJS.Timeout>();

  // Circuit breaker reset
  useEffect(() => {
    if (state.circuitBreakerOpen) {
      circuitBreakerTimeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          circuitBreakerOpen: false,
          errorCount: 0,
          recoveryAttempts: 0,
        }));
        console.log('🔄 PAM Error Recovery: Circuit breaker reset');
      }, CIRCUIT_BREAKER_TIMEOUT);
    }

    return () => {
      if (circuitBreakerTimeoutRef.current) {
        clearTimeout(circuitBreakerTimeoutRef.current);
      }
    };
  }, [state.circuitBreakerOpen]);

  const classifyError = useCallback((error: any): PamError['type'] => {
    const errorString = error?.toString()?.toLowerCase() || '';
    const messageString = error?.message?.toLowerCase() || '';
    
    // WebSocket errors
    if (errorString.includes('websocket') || 
        messageString.includes('websocket') ||
        error?.code === 1006 || 
        error?.code === 1011) {
      return 'websocket';
    }
    
    // CORS errors
    if (errorString.includes('cors') || 
        errorString.includes('access-control') ||
        messageString.includes('cors') ||
        messageString.includes('preflight')) {
      return 'cors';
    }
    
    // Authentication errors
    if (error?.status === 401 || 
        error?.status === 403 ||
        errorString.includes('unauthorized') ||
        errorString.includes('forbidden') ||
        messageString.includes('token')) {
      return 'auth';
    }
    
    // Database errors
    if (errorString.includes('permission denied') ||
        errorString.includes('rls') ||
        error?.code === '42501') {
      return 'database';
    }
    
    // Network errors
    if (errorString.includes('network') ||
        errorString.includes('fetch') ||
        errorString.includes('timeout') ||
        error?.name === 'NetworkError') {
      return 'network';
    }
    
    return 'unknown';
  }, []);

  const isRecoverable = useCallback((errorType: PamError['type']): boolean => {
    switch (errorType) {
      case 'websocket':
      case 'network':
        return true; // Can retry connection
      case 'cors':
        return false; // Configuration issue, needs backend fix
      case 'auth':
        return true; // Can refresh token
      case 'database':
        return false; // RLS policy issue, needs admin fix
      case 'unknown':
        return true; // Try recovery, might work
      default:
        return false;
    }
  }, []);

  const reportError = useCallback((error: any, type?: PamError['type']) => {
    const errorType = type || classifyError(error);
    const recoverable = isRecoverable(errorType);
    
    const pamError: PamError = {
      type: errorType,
      message: error?.message || error?.toString() || 'Unknown error occurred',
      details: error,
      timestamp: new Date(),
      recoverable,
    };

    setState(prev => {
      const newErrorCount = prev.errorCount + 1;
      const shouldOpenCircuitBreaker = newErrorCount >= CIRCUIT_BREAKER_THRESHOLD;
      
      console.error('🚨 PAM Error Recovery: Error reported', {
        type: errorType,
        message: pamError.message,
        errorCount: newErrorCount,
        recoverable,
        circuitBreaker: shouldOpenCircuitBreaker,
      });

      return {
        ...prev,
        lastError: pamError,
        errorCount: newErrorCount,
        circuitBreakerOpen: shouldOpenCircuitBreaker,
      };
    });
  }, [classifyError, isRecoverable]);

  const attemptRecovery = useCallback(async (): Promise<boolean> => {
    if (!state.lastError || !state.lastError.recoverable || state.circuitBreakerOpen) {
      console.log('🚨 PAM Error Recovery: Recovery not possible', {
        hasError: !!state.lastError,
        recoverable: state.lastError?.recoverable,
        circuitBreakerOpen: state.circuitBreakerOpen,
      });
      return false;
    }

    if (state.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      console.log('🚨 PAM Error Recovery: Max recovery attempts reached');
      setState(prev => ({ ...prev, circuitBreakerOpen: true }));
      return false;
    }

    setState(prev => ({
      ...prev,
      isRecovering: true,
      recoveryAttempts: prev.recoveryAttempts + 1,
      backoffTime: Math.min(prev.backoffTime * 2, MAX_BACKOFF_TIME),
    }));

    console.log(`🔄 PAM Error Recovery: Attempting recovery (${state.recoveryAttempts + 1}/${MAX_RECOVERY_ATTEMPTS})`);

    // Wait for backoff time
    await new Promise(resolve => {
      recoveryTimeoutRef.current = setTimeout(resolve, state.backoffTime);
    });

    try {
      switch (state.lastError.type) {
        case 'websocket':
          return await attemptWebSocketRecovery();
        
        case 'network':
          return await attemptNetworkRecovery();
        
        case 'auth':
          return await attemptAuthRecovery();
        
        default:
          return await attemptGenericRecovery();
      }
    } catch (recoveryError) {
      console.error('🚨 PAM Error Recovery: Recovery attempt failed', recoveryError);
      setState(prev => ({ ...prev, isRecovering: false }));
      return false;
    }
  }, [state]);

  const attemptWebSocketRecovery = async (): Promise<boolean> => {
    console.log('🔄 PAM Error Recovery: Attempting WebSocket recovery');
    
    try {
      // Check if the backend is reachable
      const healthResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://wheels-wins-backend-staging.onrender.com'}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      if (!healthResponse.ok) {
        throw new Error(`Backend health check failed: ${healthResponse.status}`);
      }
      
      console.log('✅ PAM Error Recovery: Backend is reachable, WebSocket recovery possible');
      setState(prev => ({ ...prev, isRecovering: false, errorCount: 0 }));
      return true;
    } catch (error) {
      console.error('❌ PAM Error Recovery: WebSocket recovery failed', error);
      setState(prev => ({ ...prev, isRecovering: false }));
      return false;
    }
  };

  const attemptNetworkRecovery = async (): Promise<boolean> => {
    console.log('🔄 PAM Error Recovery: Attempting network recovery');
    
    try {
      // Simple connectivity test
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        console.log('✅ PAM Error Recovery: Network connectivity restored');
        setState(prev => ({ ...prev, isRecovering: false, errorCount: 0 }));
        return true;
      } else {
        throw new Error('Network test failed');
      }
    } catch (error) {
      console.error('❌ PAM Error Recovery: Network recovery failed', error);
      setState(prev => ({ ...prev, isRecovering: false }));
      return false;
    }
  };

  const attemptAuthRecovery = async (): Promise<boolean> => {
    console.log('🔄 PAM Error Recovery: Attempting auth recovery');
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        // Try to refresh the session
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          throw new Error(`Session refresh failed: ${refreshError.message}`);
        }
        
        console.log('✅ PAM Error Recovery: Session refreshed successfully');
      } else {
        console.log('✅ PAM Error Recovery: Valid session found');
      }
      
      setState(prev => ({ ...prev, isRecovering: false, errorCount: 0 }));
      return true;
    } catch (error) {
      console.error('❌ PAM Error Recovery: Auth recovery failed', error);
      setState(prev => ({ ...prev, isRecovering: false }));
      return false;
    }
  };

  const attemptGenericRecovery = async (): Promise<boolean> => {
    console.log('🔄 PAM Error Recovery: Attempting generic recovery');
    
    // Wait a bit longer for generic recovery
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setState(prev => ({ ...prev, isRecovering: false, errorCount: Math.max(0, prev.errorCount - 1) }));
    return true;
  };

  const clearErrors = useCallback(() => {
    console.log('🧹 PAM Error Recovery: Clearing all errors');
    setState({
      lastError: null,
      errorCount: 0,
      isRecovering: false,
      recoveryAttempts: 0,
      maxRecoveryAttempts: MAX_RECOVERY_ATTEMPTS,
      backoffTime: BASE_BACKOFF_TIME,
      circuitBreakerOpen: false,
    });
    
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
    }
    if (circuitBreakerTimeoutRef.current) {
      clearTimeout(circuitBreakerTimeoutRef.current);
    }
  }, []);

  const isInRecoveryMode = useCallback((): boolean => {
    return state.isRecovering || state.circuitBreakerOpen;
  }, [state.isRecovering, state.circuitBreakerOpen]);

  const getRecoveryMessage = useCallback((): string => {
    if (state.circuitBreakerOpen) {
      return '🔴 PAM is temporarily unavailable. Recovery will be attempted automatically.';
    }
    
    if (state.isRecovering) {
      return `🔄 Attempting to restore PAM connection (${state.recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS})...`;
    }
    
    if (state.lastError) {
      switch (state.lastError.type) {
        case 'websocket':
          return '🔌 Connection lost. Click to retry.';
        case 'cors':
          return '🌐 Network configuration issue. Please refresh the page.';
        case 'auth':
          return '🔐 Authentication expired. Please refresh to continue.';
        case 'database':
          return '🗄️ Database access issue. Please contact support if this persists.';
        case 'network':
          return '📡 Network connectivity issue. Check your internet connection.';
        default:
          return '⚠️ PAM encountered an issue. Click to retry.';
      }
    }
    
    return '';
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
      if (circuitBreakerTimeoutRef.current) {
        clearTimeout(circuitBreakerTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    reportError,
    attemptRecovery,
    clearErrors,
    isInRecoveryMode,
    getRecoveryMessage,
  };
}