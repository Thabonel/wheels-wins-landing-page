import 'mapbox-gl/dist/mapbox-gl.css';
import { useMemo, useCallback, memo } from 'react';
import MapErrorBoundary from './map/MapErrorBoundary';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface TripMapProps {
  startLocation?: string;
  endLocation?: string;
  waypoints?: string[];
  onMapClick?: () => void;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

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

const TripMap = ({ 
  startLocation, 
  endLocation,
  waypoints = [],
  onMapClick,
  userLocation
}: TripMapProps) => {
  
  // Helper function to create a valid tuple
  const createLocationTuple = useCallback((lat: number, lng: number): [number, number] => {
    return [lng, lat];
  }, []);
  
  // Determine initial center with proper typing - only compute this once
  const initialCenter = useMemo(() => {
    if (userLocation) {
      return createLocationTuple(userLocation.latitude, userLocation.longitude);
    }
    // Default to center of US if no location
    return [-98.5795, 39.8283] as [number, number];
  }, [userLocation, createLocationTuple]);
  
  // For now, show a placeholder since we need to integrate with existing Wheels & Wins map system
  // This will be replaced with the actual map component integration
  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onReset={() => {
        console.log('Error boundary reset in TripMap');
      }}
    >
      <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center border">
        <div className="text-center space-y-2">
          <div className="text-lg font-medium">Trip Route Map</div>
          <div className="text-sm text-muted-foreground">
            {startLocation && endLocation ? (
              `Route: ${startLocation} → ${endLocation}`
            ) : (
              'Enter start and end locations to see route'
            )}
          </div>
          {waypoints && waypoints.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {waypoints.length} waypoint{waypoints.length > 1 ? 's' : ''} planned
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(TripMap);