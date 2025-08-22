import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load the main trip planner component
const UnimogTripPlanner = lazy(() => import('./UnimogTripPlanner'));

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
      <h2 className="text-lg font-semibold mb-2">Loading Trip Planner...</h2>
      <p className="text-sm text-muted-foreground">Preparing your mapping experience</p>
    </div>
  </div>
);

// Error boundary for better error handling
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Trip Planner Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold mb-2 text-red-600">
              Failed to Load Trip Planner
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Exported lazy component with error boundary and loading state
export default function LazyUnimogTripPlanner() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <UnimogTripPlanner />
      </Suspense>
    </ErrorBoundary>
  );
}