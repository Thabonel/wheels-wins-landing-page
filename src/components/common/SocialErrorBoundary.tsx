import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, RefreshCw, AlertTriangle } from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';

interface SocialErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

function SocialErrorFallback({ error, resetError }: SocialErrorFallbackProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <Users className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-xl text-red-600">Social Feature Error</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-gray-600">
          We're having trouble loading the social features. This might be due to network connectivity or server issues.
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Common causes:</h4>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                <li>• Network connection issues</li>
                <li>• Social database temporarily unavailable</li>
                <li>• User permissions or authentication problems</li>
              </ul>
            </div>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-3 bg-gray-100 rounded-md text-sm">
            <summary className="cursor-pointer font-medium text-gray-700 mb-2">
              Technical Details (Development)
            </summary>
            <div className="space-y-2">
              <p className="font-medium text-red-600">{error.name}</p>
              <p className="text-gray-700">{error.message}</p>
              <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-24">
                {error.stack}
              </pre>
            </div>
          </details>
        )}

        <div className="flex gap-2 justify-center">
          <Button onClick={resetError} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2"
          >
            Go to Home
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface SocialErrorBoundaryProps {
  children: React.ReactNode;
}

export function SocialErrorBoundary({ children }: SocialErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={null} // We'll handle the fallback internally
      onError={(error, errorInfo) => {
        console.error('Social component error:', error, errorInfo);
        // Could integrate with error reporting service here
      }}
    >
      <div className="social-error-boundary">
        {children}
      </div>
    </ErrorBoundary>
  );
}

// Higher-order component to wrap individual social components
export function withSocialErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function WrappedSocialComponent(props: P) {
    return (
      <ErrorBoundary
        fallback={
          <div className="p-4">
            <SocialErrorFallback
              error={new Error(`${componentName || 'Social component'} failed to load`)}
              resetError={() => window.location.reload()}
            />
          </div>
        }
        onError={(error, errorInfo) => {
          console.error(`Social component error in ${componentName}:`, error, errorInfo);
        }}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default SocialErrorBoundary;