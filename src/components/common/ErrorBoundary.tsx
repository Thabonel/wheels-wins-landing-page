import React from 'react';
import { SentryErrorBoundary } from '@/lib/sentry';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto text-center p-6">
        <div className="mb-6">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 mb-4">
            We've encountered an unexpected error. Our team has been notified and we're working to fix it.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-red-800 mb-2">Error Details:</h3>
          <p className="text-sm text-red-700 font-mono">
            {error.message}
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={resetError}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full"
          >
            Go to Homepage
          </Button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          If this problem persists, please contact our support team.
        </div>
      </div>
    </div>
  );
}

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <SentryErrorBoundary
      fallback={ErrorFallback}
      beforeCapture={(scope, error, errorInfo) => {
        // Add additional context to Sentry reports
        scope.setTag('errorBoundary', 'AppErrorBoundary');
        scope.setContext('errorInfo', errorInfo);
        
        // Add breadcrumb for error boundary trigger
        scope.addBreadcrumb({
          message: 'Error boundary triggered',
          level: 'error',
          category: 'error',
          data: {
            componentStack: errorInfo.componentStack,
          },
        });
      }}
    >
      {children}
    </SentryErrorBoundary>
  );
}

// Higher-order component for wrapping specific components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
) {
  return function WrappedComponent(props: P) {
    return (
      <SentryErrorBoundary fallback={fallback || ErrorFallback}>
        <Component {...props} />
      </SentryErrorBoundary>
    );
  };
}