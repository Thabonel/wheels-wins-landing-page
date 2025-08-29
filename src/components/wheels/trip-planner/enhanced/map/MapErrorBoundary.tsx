import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
        <div>
          <h3 className="text-sm font-medium">Map Error</h3>
          <div className="mt-2 text-sm">
            <p>There was a problem loading the map component.</p>
            <p className="mt-1 font-mono text-xs text-red-700">
              {error.message}
            </p>
          </div>
          <div className="mt-4">
            <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MapErrorBoundaryProps {
  children: React.ReactNode;
}

const MapErrorBoundary = ({ children }: MapErrorBoundaryProps) => {
  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onReset={() => {
        console.log('Error boundary reset in MapErrorBoundary');
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default MapErrorBoundary;