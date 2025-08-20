import 'mapbox-gl/dist/mapbox-gl.css';
import { useMemo, useCallback, memo } from 'react';
import EnhancedMap from './map/EnhancedMap';

interface TripMapProps {
  startLocation?: string;
  endLocation?: string;
  waypoints?: string[];
  onMapClick?: () => void;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  currentRoute?: any;
}


const TripMap = ({ 
  startLocation, 
  endLocation,
  waypoints = [],
  onMapClick,
  userLocation,
  currentRoute
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
  
  // Use the enhanced map with all the UI elements
  return (
    <EnhancedMap
      startLocation={startLocation}
      endLocation={endLocation}
      waypoints={waypoints}
      onMapClick={onMapClick}
      userLocation={userLocation}
      currentRoute={currentRoute}
    />
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(TripMap);