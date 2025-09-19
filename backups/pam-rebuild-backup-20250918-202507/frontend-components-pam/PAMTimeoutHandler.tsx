/**
 * PAM Timeout Handler - Enhanced Connection Timeout Management
 * Day 2 Hour 2: Timeout handling for unresponsive connections
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, RefreshCw, AlertTriangle } from 'lucide-react';

interface PAMTimeoutHandlerProps {
  children: React.ReactNode;
  timeout?: number; // milliseconds
  onTimeout?: () => void;
  onReconnect?: () => void;
  isConnecting?: boolean;
  isConnected?: boolean;
  connectionError?: string | null;
}

const PAMTimeoutHandler: React.FC<PAMTimeoutHandlerProps> = ({
  children,
  timeout = 30000, // 30 seconds default
  onTimeout,
  onReconnect,
  isConnecting = false,
  isConnected = false,
  connectionError = null
}) => {
  const [timeoutTriggered, setTimeoutTriggered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeout);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;
  const retryDelays = [2000, 5000, 10000]; // 2s, 5s, 10s

  // Start timeout when connecting
  useEffect(() => {
    if (isConnecting && !isConnected && !connectionError) {
      startTimeout();
    } else {
      clearTimeout();
    }

    return () => clearTimeout();
  }, [isConnecting, isConnected, connectionError]);

  // Reset timeout when connection is successful
  useEffect(() => {
    if (isConnected) {
      setTimeoutTriggered(false);
      setRetryCount(0);
      setIsRetrying(false);
      clearTimeout();
    }
  }, [isConnected]);

  const startTimeout = useCallback(() => {
    clearTimeout();
    setTimeRemaining(timeout);
    setTimeoutTriggered(false);

    // Countdown timer
    countdownRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        return newTime <= 0 ? 0 : newTime;
      });
    }, 1000);

    // Timeout timer
    timeoutRef.current = setTimeout(() => {
      setTimeoutTriggered(true);
      clearCountdown();

      if (onTimeout) {
        onTimeout();
      }
    }, timeout);
  }, [timeout, onTimeout]);

  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    clearCountdown();
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);
    const delay = retryDelays[retryCount] || 10000;

    setTimeout(() => {
      setRetryCount(prev => prev + 1);
      setIsRetrying(false);
      setTimeoutTriggered(false);

      if (onReconnect) {
        onReconnect();
      }
    }, delay);
  }, [retryCount, onReconnect]);

  const handleManualRetry = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
    setTimeoutTriggered(false);

    if (onReconnect) {
      onReconnect();
    }
  }, [onReconnect]);

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const getProgressPercentage = (): number => {
    return ((timeout - timeRemaining) / timeout) * 100;
  };

  // Show timeout UI if timeout was triggered and we're not connected
  if (timeoutTriggered && !isConnected) {
    return (
      <Card className="max-w-md mx-auto border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Clock className="h-5 w-5" />
            Connection Timeout
            <Badge variant="outline" className="ml-auto">
              Attempt {retryCount + 1}/{maxRetries + 1}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-white rounded-lg border border-orange-200">
            <h4 className="font-medium text-orange-900 mb-2">Connection timed out</h4>
            <p className="text-orange-700 text-sm">
              PAM didn't respond within {timeout / 1000} seconds. This could be due to:
            </p>
            <ul className="text-orange-700 text-sm mt-2 space-y-1">
              <li>• Slow network connection</li>
              <li>• Backend service overload</li>
              <li>• DNS resolution issues</li>
              <li>• Firewall blocking the connection</li>
            </ul>
          </div>

          {connectionError && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-900 mb-1">Error Details:</h4>
              <p className="text-red-700 text-sm">{connectionError}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isRetrying ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Retrying in {formatTime(retryDelays[retryCount - 1] || 10000)}...
                </span>
              ) : (
                `Retry attempts: ${retryCount}/${maxRetries}`
              )}
            </div>
            <div className="flex gap-2">
              {retryCount < maxRetries && !isRetrying && (
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Auto Retry
                </Button>
              )}
              <Button
                onClick={handleManualRetry}
                disabled={isRetrying}
                size="sm"
                variant="outline"
              >
                Try Now
              </Button>
            </div>
          </div>

          {retryCount >= maxRetries && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Max retries reached</h4>
                  <p className="text-red-700 text-sm mt-1">
                    Try using the mock development mode or check your network connection.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/pam-dev-test'}
                    size="sm"
                    className="mt-2 bg-green-600 hover:bg-green-700"
                  >
                    Use Mock Mode
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show connecting UI with countdown
  if (isConnecting && !isConnected && !connectionError) {
    return (
      <Card className="max-w-md mx-auto border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Connecting to PAM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-blue-700 text-sm mb-2">
              Establishing connection...
            </p>
            <p className="text-blue-600 text-xs">
              Timeout in {formatTime(timeRemaining)}
            </p>
          </div>

          <Progress
            value={getProgressPercentage()}
            className="h-2"
          />

          <div className="text-xs text-center text-blue-600">
            This may take a few seconds for the first connection
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render children normally when connected or not connecting
  return <>{children}</>;
};

export default PAMTimeoutHandler;