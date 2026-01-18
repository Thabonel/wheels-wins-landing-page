/**
 * PAM Error Boundary Component
 * Provides robust error handling for PAM components with recovery mechanisms
 * Prevents entire application crashes when PAM encounters issues
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetryButton?: boolean;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  lastErrorTime: Date | null;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export class PamErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      lastErrorTime: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      lastErrorTime: new Date(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 PAM Error Boundary: Caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    this.setState({
      error,
      errorInfo,
    });

    // Report error to parent component
    this.props.onError?.(error, errorInfo);

    // Track error in console for debugging
    this.logErrorDetails(error, errorInfo);
  }

  private logErrorDetails = (error: Error, errorInfo: ErrorInfo) => {
    const errorType = this.classifyError(error);
    const isRecoverable = this.isErrorRecoverable(errorType);
    
    console.group('🚨 PAM Error Boundary Details');
    console.error('Error Type:', errorType);
    console.error('Recoverable:', isRecoverable);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Retry Count:', this.state.retryCount);
    console.error('Time:', new Date().toISOString());
    console.groupEnd();
  };

  private classifyError = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('websocket') || message.includes('connection')) {
      return 'Connection Error';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network Error';
    }
    if (message.includes('auth') || message.includes('token')) {
      return 'Authentication Error';
    }
    if (message.includes('cors')) {
      return 'CORS Error';
    }
    if (message.includes('permission') || message.includes('rls')) {
      return 'Database Permission Error';
    }
    
    return 'Unknown Error';
  };

  private isErrorRecoverable = (errorType: string): boolean => {
    const recoverableErrors = [
      'Connection Error',
      'Network Error',
      'Authentication Error',
    ];
    return recoverableErrors.includes(errorType);
  };

  private handleRetry = async () => {
    if (this.state.retryCount >= (this.props.maxRetries || MAX_RETRIES)) {
      console.warn('🚨 PAM Error Boundary: Max retry attempts reached');
      return;
    }

    this.setState({ isRetrying: true });
    console.log(`🔄 PAM Error Boundary: Attempting retry ${this.state.retryCount + 1}/${this.props.maxRetries || MAX_RETRIES}`);

    // Wait for retry delay
    await new Promise(resolve => {
      this.retryTimeout = setTimeout(resolve, RETRY_DELAY);
    });

    // Reset error state to trigger re-render
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: false,
    }));

    console.log('✅ PAM Error Boundary: Retry initiated');
  };

  private handleRefresh = () => {
    console.log('🔄 PAM Error Boundary: Refreshing page');
    window.location.reload();
  };

  private renderErrorFallback = () => {
    const { hasError, error, retryCount, isRetrying, lastErrorTime } = this.state;
    const { showRetryButton = true, maxRetries = MAX_RETRIES } = this.props;

    if (!hasError || !error) return null;

    const errorType = this.classifyError(error);
    const isRecoverable = this.isErrorRecoverable(errorType);
    const canRetry = retryCount < maxRetries && isRecoverable && showRetryButton;

    // Custom fallback provided
    if (this.props.fallback) {
      return this.props.fallback;
    }

    // Default PAM error UI
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">PAM Assistant Unavailable</CardTitle>
          <CardDescription>
            {errorType} • {lastErrorTime?.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {this.getErrorMessage(errorType, isRecoverable)}
            </AlertDescription>
          </Alert>

          {/* Error Details (Development Only) */}
          {import.meta.env.DEV && (
            <details className="text-xs text-gray-600">
              <summary className="cursor-pointer font-medium">Technical Details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                {error.message}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {canRetry && (
              <Button
                onClick={this.handleRetry}
                disabled={isRetrying}
                className="flex items-center gap-2"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Retrying... ({retryCount + 1}/{maxRetries})
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Try Again ({retryCount}/{maxRetries})
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={this.handleRefresh}
              className="flex items-center gap-2"
            >
              <WifiOff className="w-4 h-4" />
              Refresh Page
            </Button>
          </div>

          {/* Status Information */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>🔍 Error Type: {errorType}</p>
            <p>🔄 Recoverable: {isRecoverable ? 'Yes' : 'No'}</p>
            <p>⚡ Retry Count: {retryCount}/{maxRetries}</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  private getErrorMessage = (errorType: string, isRecoverable: boolean): string => {
    switch (errorType) {
      case 'Connection Error':
        return 'Unable to connect to PAM servers. This is usually temporary.';
      case 'Network Error':
        return 'Network connectivity issue. Check your internet connection.';
      case 'Authentication Error':
        return 'Authentication expired. Please refresh the page to continue.';
      case 'CORS Error':
        return 'Configuration issue. Please refresh the page or contact support.';
      case 'Database Permission Error':
        return 'Data access issue. Please contact support if this persists.';
      default:
        return isRecoverable 
          ? 'PAM encountered an issue but can be recovered.'
          : 'PAM encountered an issue that requires a page refresh.';
    }
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorFallback();
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with PAM error boundary
 */
export function withPamErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<Props, 'children'>
) {
  const ComponentWithErrorBoundary = (props: P) => (
    <PamErrorBoundary {...options}>
      <WrappedComponent {...props} />
    </PamErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withPamErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ComponentWithErrorBoundary;
}