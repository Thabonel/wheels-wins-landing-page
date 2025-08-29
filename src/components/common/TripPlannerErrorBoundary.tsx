import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, RefreshCw, AlertTriangle, Navigation } from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';

interface TripPlannerErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

function TripPlannerErrorFallback({ error, resetError }: TripPlannerErrorFallbackProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <MapPin className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-xl text-red-600">Trip Planner Error</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-gray-600">
          We're having trouble loading the trip planning features. This might be related to map services or route calculation.
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Possible issues:</h4>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                <li>• Mapbox API key configuration</li>
                <li>• Network connectivity problems</li>
                <li>• Route calculation service unavailable</li>
                <li>• GPS/location services disabled</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Navigation className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Try these steps:</h4>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• Check your internet connection</li>
                <li>• Enable location services in browser</li>
                <li>• Refresh the page to retry</li>
                <li>• Clear browser cache if problem persists</li>
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
            Retry Trip Planner
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/wheels'}
            className="flex items-center gap-2"
          >
            Back to Wheels
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface TripPlannerErrorBoundaryProps {
  children: React.ReactNode;
}

export function TripPlannerErrorBoundary({ children }: TripPlannerErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={null} // We'll handle the fallback internally
      onError={(error, errorInfo) => {
        console.error('Trip Planner error:', error, errorInfo);
        // Could integrate with error reporting service here
        
        // Log specific trip planner context
        console.error('Trip Planner Context:', {
          userAgent: navigator.userAgent,
          geolocationEnabled: 'geolocation' in navigator,
          mapboxToken: !!import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN,
          timestamp: new Date().toISOString()
        });
      }}
    >
      <div className="trip-planner-error-boundary">
        {children}
      </div>
    </ErrorBoundary>
  );
}

// Higher-order component to wrap individual trip planner components
export function withTripPlannerErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function WrappedTripPlannerComponent(props: P) {
    return (
      <ErrorBoundary
        fallback={
          <div className="p-4 min-h-[200px] flex items-center justify-center">
            <TripPlannerErrorFallback
              error={new Error(`${componentName || 'Trip planner component'} failed to load`)}
              resetError={() => window.location.reload()}
            />
          </div>
        }
        onError={(error, errorInfo) => {
          console.error(`Trip planner component error in ${componentName}:`, error, errorInfo);
        }}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default TripPlannerErrorBoundary;