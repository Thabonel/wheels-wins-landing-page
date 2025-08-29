/**
 * PAM Component with AI SDK Fallback
 * Handles switching between legacy WebSocket PAM and new AI SDK implementation
 */

import React, { useState, useEffect } from 'react';
import { flags, getUserVariant } from '@/config/featureFlags';
import { PamChatPOC } from './PamChatPOC';
import { useAuth } from '@/context/AuthContext';
import * as Sentry from '@sentry/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

interface PamWithFallbackProps {
  className?: string;
  // Props that would be passed to the original PAM component
  onClose?: () => void;
  initialMessage?: string;
}

export const PamWithFallback: React.FC<PamWithFallbackProps> = ({
  className,
  onClose,
  initialMessage,
}) => {
  const { user } = useAuth();
  const [variant, setVariant] = useState<'ai-sdk' | 'legacy' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallbackTriggered, setFallbackTriggered] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(false);
  
  // Circuit breaker settings
  const ERROR_THRESHOLD = 3; // Max consecutive errors before fallback
  const CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    try {
      if (!user?.id) {
        // Default to legacy for non-authenticated users
        setVariant('legacy');
        return;
      }

      const userVariant = getUserVariant(user.id);
      setVariant(userVariant);

      // Track variant assignment in Sentry
      Sentry.addBreadcrumb({
        message: 'PAM Variant Assignment',
        data: {
          userId: user.id,
          variant: userVariant,
          rolloutPercentage: flags.aiSdkRolloutPercentage,
          pocMode: flags.aiSdkPocMode,
        },
        level: 'info',
      });
    } catch (err) {
      console.error('Error determining PAM variant:', err);
      Sentry.captureException(err);
      setVariant('legacy'); // Safe fallback
    }
  }, [user?.id]);

  const handleFallbackToLegacy = (reason: string = 'User initiated fallback') => {
    setFallbackTriggered(true);
    setVariant('legacy');
    setError(null);
    setCircuitBreakerOpen(false);
    setConsecutiveErrors(0);
    
    Sentry.addBreadcrumb({
      message: 'PAM Fallback Triggered',
      data: { reason, consecutiveErrors },
      level: 'warning',
    });
  };

  const handleRetryAiSdk = () => {
    setFallbackTriggered(false);
    setVariant('ai-sdk');
    setError(null);
    setConsecutiveErrors(0);
    setCircuitBreakerOpen(false);
  };

  const handleAiSdkError = (error: Error) => {
    const newErrorCount = consecutiveErrors + 1;
    setConsecutiveErrors(newErrorCount);
    setError(error.message);

    Sentry.addBreadcrumb({
      message: 'PAM AI SDK Error',
      data: { 
        error: error.message, 
        consecutiveErrors: newErrorCount,
        circuitBreakerOpen 
      },
      level: 'error',
    });

    // Circuit breaker logic
    if (newErrorCount >= ERROR_THRESHOLD && !circuitBreakerOpen) {
      setCircuitBreakerOpen(true);
      handleFallbackToLegacy('Circuit breaker triggered - too many consecutive errors');
      
      // Auto-retry after timeout
      setTimeout(() => {
        if (circuitBreakerOpen) {
          setCircuitBreakerOpen(false);
          setConsecutiveErrors(0);
        }
      }, CIRCUIT_BREAKER_TIMEOUT);
    }
  };

  const handleAiSdkSuccess = () => {
    // Reset error count on successful interaction
    if (consecutiveErrors > 0) {
      setConsecutiveErrors(0);
      setError(null);
    }
  };

  // Show loading state while determining variant
  if (variant === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading PAM...</p>
        </div>
      </div>
    );
  }

  // Render AI SDK POC version
  if (variant === 'ai-sdk' && !fallbackTriggered) {
    return (
      <div className={className}>
        {/* Show POC banner in development */}
        {import.meta.env.DEV && (
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>AI SDK POC Mode - Testing Vercel AI SDK Integration</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFallbackToLegacy}
                className="ml-2"
              >
                <RefreshCcw className="w-3 h-3 mr-1" />
                Use Legacy
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <PamChatPOC 
          className="w-full" 
          onError={handleAiSdkError}
          onSuccess={handleAiSdkSuccess}
        />
        
        {/* Error boundary with fallback option */}
        {error && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>AI SDK Error: {error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFallbackToLegacy}
                className="ml-2"
              >
                <RefreshCcw className="w-3 h-3 mr-1" />
                Fallback
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Render legacy WebSocket PAM (placeholder for now)
  return (
    <div className={className}>
      {fallbackTriggered && (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Using Legacy PAM (WebSocket) - AI SDK fallback triggered</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryAiSdk}
              className="ml-2"
            >
              <RefreshCcw className="w-3 h-3 mr-1" />
              Retry AI SDK
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg p-6 text-center space-y-4">
        <h3 className="text-lg font-semibold">Legacy PAM (WebSocket)</h3>
        <p className="text-muted-foreground">
          {fallbackTriggered 
            ? 'Fallback to original WebSocket-based PAM implementation'
            : 'Using original WebSocket PAM (not selected for AI SDK rollout)'
          }
        </p>
        
        {/* Placeholder - In real implementation, this would render the existing PAM component */}
        <div className="bg-muted rounded-lg p-8">
          <p className="text-sm">
            [Legacy PAM Component Would Render Here]
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            In real implementation: &lt;Pam {...props} /&gt;
          </p>
        </div>

        {onClose && (
          <Button onClick={onClose} variant="outline">
            Close PAM
          </Button>
        )}
      </div>
    </div>
  );
};