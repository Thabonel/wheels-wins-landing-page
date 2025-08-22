/**
 * Enhanced Voice Error Recovery Hook
 * 
 * Provides comprehensive error recovery capabilities for the PAM voice system.
 * Integrates with the existing voice infrastructure to provide:
 * - Intelligent error classification and recovery strategies
 * - Exponential backoff retry logic with jitter
 * - Circuit breaker pattern for fault tolerance
 * - Fallback to different TTS engines and text-only modes
 * - Real-time health monitoring and diagnostics
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useVoice } from '@/hooks/useVoice';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { voiceOrchestrator } from '@/services/VoiceOrchestrator';

// Types for error recovery system
export type VoiceErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type VoiceErrorCategory = 
  | 'network' 
  | 'audio_playback' 
  | 'tts_synthesis' 
  | 'permission' 
  | 'browser_compatibility' 
  | 'api_quota' 
  | 'authentication'
  | 'unknown';

export type VoiceRecoveryStrategy = 
  | 'retry_same_engine' 
  | 'fallback_engine' 
  | 'text_only' 
  | 'silence' 
  | 'user_prompt';

export interface VoiceError {
  id: string;
  message: string;
  category: VoiceErrorCategory;
  severity: VoiceErrorSeverity;
  timestamp: number;
  context: string;
  recoverable: boolean;
  retryCount: number;
  maxRetries: number;
  originalError?: Error;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterMax: number;
}

export interface RecoveryMetrics {
  totalErrors: number;
  recoveredErrors: number;
  fallbacksUsed: number;
  textOnlyFallbacks: number;
  avgRecoveryTime: number;
  engineReliability: Record<string, number>;
  errorsByCategory: Record<VoiceErrorCategory, number>;
}

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitterMax: 500
};

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

export const useVoiceErrorRecovery = () => {
  const voice = useVoice();
  const voiceStore = useVoiceStore();
  
  // Error tracking state
  const [errors, setErrors] = useState<VoiceError[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);
  const [fallbackMode, setFallbackMode] = useState<'none' | 'text-only' | 'silent'>('none');
  
  // Recovery metrics
  const [metrics, setMetrics] = useState<RecoveryMetrics>({
    totalErrors: 0,
    recoveredErrors: 0,
    fallbacksUsed: 0,
    textOnlyFallbacks: 0,
    avgRecoveryTime: 0,
    engineReliability: {},
    errorsByCategory: {} as Record<VoiceErrorCategory, number>
  });
  
  // Circuit breaker state for each TTS engine
  const [circuitBreakers, setCircuitBreakers] = useState<Record<string, CircuitBreakerState>>({});
  
  // Recovery attempt tracking
  const recoveryAttempts = useRef<Map<string, { startTime: number; attempts: number }>>(new Map());
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Error classification function
  const classifyError = useCallback((error: Error, context: string): { category: VoiceErrorCategory; severity: VoiceErrorSeverity; recoverable: boolean } => {
    const message = error.message?.toLowerCase() || '';
    
    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection') || message.includes('timeout')) {
      return { category: 'network', severity: 'medium', recoverable: true };
    }
    
    // Audio playback errors
    if (message.includes('audio') || message.includes('playback') || message.includes('media')) {
      return { category: 'audio_playback', severity: 'medium', recoverable: true };
    }
    
    // TTS synthesis errors
    if (message.includes('synthesis') || message.includes('tts') || message.includes('voice') || message.includes('speech')) {
      return { category: 'tts_synthesis', severity: 'medium', recoverable: true };
    }
    
    // Permission errors
    if (message.includes('permission') || message.includes('denied') || message.includes('blocked')) {
      return { category: 'permission', severity: 'high', recoverable: false };
    }
    
    // Browser compatibility
    if (message.includes('not supported') || message.includes('unsupported') || message.includes('compatibility')) {
      return { category: 'browser_compatibility', severity: 'high', recoverable: false };
    }
    
    // API quota/rate limiting
    if (message.includes('quota') || message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
      return { category: 'api_quota', severity: 'medium', recoverable: true };
    }
    
    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401') || message.includes('forbidden') || message.includes('403')) {
      return { category: 'authentication', severity: 'high', recoverable: false };
    }
    
    // Unknown errors
    return { category: 'unknown', severity: 'medium', recoverable: true };
  }, []);

  // Calculate exponential backoff delay with jitter
  const calculateRetryDelay = useCallback((attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number => {
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
      config.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * config.jitterMax;
    return delay + jitter;
  }, []);

  // Circuit breaker check
  const isCircuitOpen = useCallback((engine: string): boolean => {
    const breaker = circuitBreakers[engine];
    if (!breaker || !breaker.isOpen) return false;
    
    // Check if timeout has passed
    if (Date.now() > breaker.nextAttemptTime) {
      // Reset circuit breaker
      setCircuitBreakers(prev => ({
        ...prev,
        [engine]: { ...breaker, isOpen: false, failureCount: 0 }
      }));
      return false;
    }
    
    return true;
  }, [circuitBreakers]);

  // Update circuit breaker on failure
  const recordFailure = useCallback((engine: string) => {
    setCircuitBreakers(prev => {
      const current = prev[engine] || { isOpen: false, failureCount: 0, lastFailureTime: 0, nextAttemptTime: 0 };
      const newFailureCount = current.failureCount + 1;
      
      const shouldOpen = newFailureCount >= CIRCUIT_BREAKER_THRESHOLD;
      
      return {
        ...prev,
        [engine]: {
          isOpen: shouldOpen,
          failureCount: newFailureCount,
          lastFailureTime: Date.now(),
          nextAttemptTime: shouldOpen ? Date.now() + CIRCUIT_BREAKER_TIMEOUT : 0
        }
      };
    });
  }, []);

  // Update circuit breaker on success
  const recordSuccess = useCallback((engine: string) => {
    setCircuitBreakers(prev => ({
      ...prev,
      [engine]: { isOpen: false, failureCount: 0, lastFailureTime: 0, nextAttemptTime: 0 }
    }));
  }, []);

  // Main error handling function
  const handleVoiceError = useCallback(async (
    error: Error, 
    context: string = 'general', 
    originalText?: string
  ): Promise<boolean> => {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const classification = classifyError(error, context);
    
    const voiceError: VoiceError = {
      id: errorId,
      message: error.message || 'Unknown voice error',
      category: classification.category,
      severity: classification.severity,
      timestamp: Date.now(),
      context,
      recoverable: classification.recoverable,
      retryCount: 0,
      maxRetries: classification.severity === 'critical' ? 5 : DEFAULT_RETRY_CONFIG.maxRetries,
      originalError: error
    };
    
    console.error(`🚨 Voice Error [${classification.category}/${classification.severity}]:`, voiceError);
    
    // Add to error log
    setErrors(prev => [...prev.slice(-9), voiceError]); // Keep last 10 errors
    
    // Update metrics
    setMetrics(prev => ({
      ...prev,
      totalErrors: prev.totalErrors + 1,
      errorsByCategory: {
        ...prev.errorsByCategory,
        [classification.category]: (prev.errorsByCategory[classification.category] || 0) + 1
      }
    }));
    
    // Start recovery if error is recoverable
    if (classification.recoverable) {
      return attemptRecovery(voiceError, originalText);
    } else {
      // Non-recoverable error - activate fallback mode
      activateFallbackMode(classification.severity);
      return false;
    }
  }, [classifyError]);

  // Recovery attempt function
  const attemptRecovery = useCallback(async (
    voiceError: VoiceError, 
    originalText?: string
  ): Promise<boolean> => {
    setIsRecovering(true);
    
    // Track recovery attempt
    const existing = recoveryAttempts.current.get(voiceError.id);
    if (!existing) {
      recoveryAttempts.current.set(voiceError.id, { startTime: Date.now(), attempts: 0 });
    }
    
    try {
      let recovered = false;
      
      // Try different recovery strategies based on error category
      switch (voiceError.category) {
        case 'network':
        case 'tts_synthesis':
          recovered = await tryEngineRecovery(voiceError, originalText);
          break;
          
        case 'audio_playback':
          recovered = await tryPlaybackRecovery(voiceError, originalText);
          break;
          
        case 'api_quota':
          recovered = await tryQuotaRecovery(voiceError, originalText);
          break;
          
        default:
          recovered = await tryGenericRecovery(voiceError, originalText);
          break;
      }
      
      if (recovered) {
        setMetrics(prev => ({ ...prev, recoveredErrors: prev.recoveredErrors + 1 }));
        
        // Calculate recovery time
        const attempt = recoveryAttempts.current.get(voiceError.id);
        if (attempt) {
          const recoveryTime = Date.now() - attempt.startTime;
          setMetrics(prev => ({
            ...prev,
            avgRecoveryTime: (prev.avgRecoveryTime * prev.recoveredErrors + recoveryTime) / (prev.recoveredErrors + 1)
          }));
        }
        
        // Clear recovery tracking
        recoveryAttempts.current.delete(voiceError.id);
        console.log(`✅ Voice error recovered: ${voiceError.id}`);
      }
      
      return recovered;
      
    } catch (recoveryError) {
      console.error(`❌ Recovery failed for ${voiceError.id}:`, recoveryError);
      return false;
    } finally {
      setIsRecovering(false);
    }
  }, []);

  // Engine-specific recovery
  const tryEngineRecovery = useCallback(async (
    voiceError: VoiceError, 
    originalText?: string
  ): Promise<boolean> => {
    if (!originalText) return false;
    
    const engines = ['edge', 'coqui', 'system'];
    
    for (const engine of engines) {
      if (isCircuitOpen(engine)) {
        console.log(`⏭️ Skipping ${engine} (circuit breaker open)`);
        continue;
      }
      
      try {
        console.log(`🔄 Attempting recovery with ${engine} engine...`);
        
        // Try to speak with different engine
        await voice.speak(originalText, { priority: 'normal', fallbackToText: true });
        
        recordSuccess(engine);
        return true;
        
      } catch (error) {
        console.warn(`❌ Engine ${engine} recovery failed:`, error);
        recordFailure(engine);
        continue;
      }
    }
    
    // All engines failed - fallback to text mode
    setFallbackMode('text-only');
    setMetrics(prev => ({ ...prev, textOnlyFallbacks: prev.textOnlyFallbacks + 1 }));
    return false;
  }, [voice, isCircuitOpen, recordSuccess, recordFailure]);

  // Audio playback recovery
  const tryPlaybackRecovery = useCallback(async (
    voiceError: VoiceError, 
    originalText?: string
  ): Promise<boolean> => {
    try {
      // Clear audio queue and restart
      voiceStore.clearAudioQueue();
      
      // Wait a bit then retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (originalText) {
        await voice.speak(originalText, { priority: 'normal', fallbackToText: true });
        return true;
      }
      
    } catch (error) {
      console.warn('❌ Playback recovery failed:', error);
    }
    
    return false;
  }, [voice, voiceStore]);

  // API quota recovery
  const tryQuotaRecovery = useCallback(async (
    voiceError: VoiceError, 
    originalText?: string
  ): Promise<boolean> => {
    // Wait longer for quota recovery
    const delay = calculateRetryDelay(voiceError.retryCount, {
      ...DEFAULT_RETRY_CONFIG,
      baseDelay: 5000,
      maxDelay: 60000
    });
    
    console.log(`⏳ Quota recovery waiting ${delay}ms...`);
    
    return new Promise((resolve) => {
      const timeoutId = setTimeout(async () => {
        try {
          if (originalText) {
            await voice.speak(originalText, { priority: 'low', fallbackToText: true });
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          resolve(false);
        }
      }, delay);
      
      retryTimeouts.current.set(voiceError.id, timeoutId);
    });
  }, [calculateRetryDelay, voice]);

  // Generic recovery strategy
  const tryGenericRecovery = useCallback(async (
    voiceError: VoiceError, 
    originalText?: string
  ): Promise<boolean> => {
    const delay = calculateRetryDelay(voiceError.retryCount);
    
    return new Promise((resolve) => {
      const timeoutId = setTimeout(async () => {
        try {
          if (originalText) {
            await voice.speak(originalText, { priority: 'normal', fallbackToText: true });
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          resolve(false);
        }
      }, delay);
      
      retryTimeouts.current.set(voiceError.id, timeoutId);
    });
  }, [calculateRetryDelay, voice]);

  // Activate fallback mode
  const activateFallbackMode = useCallback((severity: VoiceErrorSeverity) => {
    if (severity === 'critical') {
      setFallbackMode('silent');
    } else {
      setFallbackMode('text-only');
    }
    
    setMetrics(prev => ({ ...prev, fallbacksUsed: prev.fallbacksUsed + 1 }));
    console.log(`🔄 Activated fallback mode: ${fallbackMode}`);
  }, [fallbackMode]);

  // Manual recovery trigger
  const triggerRecovery = useCallback(async (text?: string): Promise<boolean> => {
    console.log('🔧 Manual recovery triggered');
    
    try {
      // Reset fallback mode
      setFallbackMode('none');
      
      // Clear circuit breakers
      setCircuitBreakers({});
      
      // Reinitialize voice system if needed
      if (!voice.isInitialized) {
        await voice.reset();
      }
      
      // Test with provided text
      if (text) {
        await voice.speak(text, { priority: 'normal', fallbackToText: true });
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Manual recovery failed:', error);
      return false;
    }
  }, [voice]);

  // Voice health check
  const performHealthCheck = useCallback(async (): Promise<{
    status: 'healthy' | 'degraded' | 'failed';
    issues: string[];
    recommendations: string[];
  }> => {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check initialization status
    if (!voice.isInitialized) {
      issues.push('Voice system not initialized');
      recommendations.push('Restart voice system');
    }
    
    // Check error rate
    const recentErrors = errors.filter(e => Date.now() - e.timestamp < 300000); // Last 5 minutes
    if (recentErrors.length > 10) {
      issues.push('High error rate detected');
      recommendations.push('Switch to text-only mode temporarily');
    }
    
    // Check circuit breaker status
    const openBreakers = Object.entries(circuitBreakers)
      .filter(([_, breaker]) => breaker.isOpen)
      .map(([engine, _]) => engine);
    
    if (openBreakers.length > 0) {
      issues.push(`Circuit breakers open: ${openBreakers.join(', ')}`);
      recommendations.push('Wait for circuit breakers to reset or use manual recovery');
    }
    
    // Check fallback mode
    if (fallbackMode !== 'none') {
      issues.push(`System in fallback mode: ${fallbackMode}`);
      recommendations.push('Try manual recovery to restore voice functionality');
    }
    
    let status: 'healthy' | 'degraded' | 'failed' = 'healthy';
    if (issues.length > 3 || fallbackMode === 'silent') {
      status = 'failed';
    } else if (issues.length > 0 || fallbackMode === 'text-only') {
      status = 'degraded';
    }
    
    return { status, issues, recommendations };
  }, [voice, errors, circuitBreakers, fallbackMode]);

  // Listen to voice system errors
  useEffect(() => {
    const handleStoreError = () => {
      const lastError = voiceStore.lastError;
      if (lastError) {
        handleVoiceError(lastError, 'store_error');
      }
    };

    // Check for errors on store updates
    if (voiceStore.lastError) {
      handleStoreError();
    }
  }, [voiceStore.lastError, handleVoiceError]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
      retryTimeouts.current.clear();
    };
  }, []);

  // Computed status
  const status = useMemo(() => {
    if (fallbackMode === 'silent') return 'failed';
    if (fallbackMode === 'text-only' || isRecovering) return 'degraded';
    if (voice.isInitialized && Object.keys(circuitBreakers).length === 0) return 'healthy';
    return 'degraded';
  }, [fallbackMode, isRecovering, voice.isInitialized, circuitBreakers]);

  return {
    // Status
    status,
    isRecovering,
    fallbackMode,
    
    // Error information
    errors: errors.slice(-5), // Return last 5 errors
    recentErrors: errors.filter(e => Date.now() - e.timestamp < 300000), // Last 5 minutes
    
    // Metrics
    metrics,
    
    // Circuit breaker info
    circuitBreakers,
    
    // Recovery functions
    handleVoiceError,
    triggerRecovery,
    performHealthCheck,
    
    // Utility functions
    classifyError,
    isCircuitOpen,
    
    // Configuration
    retryConfig: DEFAULT_RETRY_CONFIG
  };
};