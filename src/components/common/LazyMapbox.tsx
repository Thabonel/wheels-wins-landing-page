import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the actual MapboxMap component
const MapboxMap = lazy(() => 
  import('@/components/wheels/trip-planner/MapboxMap').then(module => ({
    default: module.MapboxMap
  }))
);

interface LazyMapboxProps {
  route: any;
  mapboxToken: string;
  onRouteUpdate?: (route: any) => void;
  waypoints?: any[];
  selectedTemplate?: any;
  showRoute?: boolean;
  mapCenter?: [number, number];
  mapZoom?: number;
  className?: string;
}

export function LazyMapbox(props: LazyMapboxProps) {
  return (
    <Suspense
      fallback={
        <div className={props.className || "h-full w-full"}>
          <Skeleton className="h-full w-full">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          </Skeleton>
        </div>
      }
    >
      <MapboxMap {...props} />
    </Suspense>
  );
}