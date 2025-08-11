/**
 * Voice Error Boundary Component
 * Catches and handles errors in voice components gracefully
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class VoiceErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Voice Error Boundary caught error:', error, errorInfo);
    }

    // Call error handler if provided
    this.props.onError?.(error, errorInfo);

    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Auto-reset after 30 seconds if this is the first error
    if (this.state.errorCount === 0) {
      this.resetTimeoutId = setTimeout(() => {
        this.handleReset();
      }, 30000);
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
  }

  handleReset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900">
                Voice Feature Error
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {this.state.error?.message || 'An error occurred with the voice feature'}
              </p>
              
              {/* Show technical details in development */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-3">
                  <summary className="text-xs text-red-600 cursor-pointer">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-32 p-2 bg-red-100 rounded">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2 mt-3">
                <Button
                  onClick={this.handleReset}
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
                
                {this.state.errorCount > 2 && (
                  <Button
                    onClick={() => window.location.reload()}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Reload Page
                  </Button>
                )}
              </div>

              {this.state.errorCount > 2 && (
                <p className="text-xs text-red-600 mt-2">
                  Multiple errors detected. Voice features may be unavailable.
                </p>
              )}
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook to use with voice components
export const useVoiceErrorHandler = () => {
  const handleVoiceError = React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    // Log to monitoring service
    console.error('Voice error:', error);
    
    // Could send to Sentry or other monitoring service here
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          voice: {
            component: errorInfo?.componentStack || 'unknown',
          },
        },
      });
    }
  }, []);

  return { handleVoiceError };
};