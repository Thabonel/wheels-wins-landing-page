import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load Mapbox components to dramatically reduce initial bundle size
const LazyMapbox = React.lazy(() => import('./mapbox-wrapper'));

interface LazyMapProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  [key: string]: any;
}

// Map loading skeleton
const MapSkeleton = ({ width = '100%', height = 400, className = '' }: LazyMapProps) => (
  <div
    className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}
    style={{ width, height }}
  >
    <Skeleton className="w-full h-full" />

    {/* Simulate map UI elements */}
    <div className="absolute top-4 left-4">
      <Skeleton className="w-8 h-8 rounded" />
    </div>
    <div className="absolute top-4 right-4">
      <div className="space-y-2">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
      </div>
    </div>
    <div className="absolute bottom-4 left-4">
      <Skeleton className="w-20 h-4 rounded" />
    </div>

    {/* Loading text */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-white/90 px-4 py-2 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600">Loading map...</span>
        </div>
      </div>
    </div>
  </div>
);

// Lazy map component
export const LazyMap: React.FC<LazyMapProps> = ({ width, height, className, ...props }) => {
  return (
    <Suspense fallback={<MapSkeleton width={width} height={height} className={className} />}>
      <LazyMapbox {...props} width={width} height={height} className={className} />
    </Suspense>
  );
};

// Preload map when user likely to need it
export const preloadMap = () => {
  import('./mapbox-wrapper');
  // Also preload the heavy mapbox-gl library
  import('mapbox-gl');
};

// Hook to preload map on user interaction (hover, focus, etc.)
export const useMapPreloader = () => {
  const preload = React.useCallback(() => {
    preloadMap();
  }, []);

  return preload;
};

// Higher-order component to add map preloading to any component
export const withMapPreloader = <P extends object>(Component: React.ComponentType<P>) => {
  return React.forwardRef<any, P>((props, ref) => {
    const preload = useMapPreloader();

    return (
      <div onMouseEnter={preload} onFocus={preload}>
        <Component {...props} ref={ref} />
      </div>
    );
  });
};

export default LazyMap;