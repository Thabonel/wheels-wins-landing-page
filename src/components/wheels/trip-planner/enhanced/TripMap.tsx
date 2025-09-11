import 'mapbox-gl/dist/mapbox-gl.css';
import { useMemo, useCallback, memo } from 'react';
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
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(TripMap);