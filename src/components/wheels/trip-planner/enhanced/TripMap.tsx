import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import { useRef, useEffect, useMemo, useCallback, memo } from 'react';
import Map from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions';
import { getMapboxToken } from '@/utils/mapboxToken';

interface TripMapProps {
  startLocation?: string;
  endLocation?: string;
  waypoints?: string[];
  onMapClick?: () => void;
  onRouteUpdate?: (route: {
    origin: string;
    destination: string;
    waypoints: Array<{ coords: [number, number]; name: string }>;
    distance: number;
    duration: number;
  }) => void;
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
  onRouteUpdate,
  userLocation
}: TripMapProps) => {
  const mapRef = useRef<mapboxgl.Map>(null);
  const directionsRef = useRef<MapboxDirections | null>(null);
  const mapboxToken = getMapboxToken();
  
  // Helper function to create a valid tuple
  const createLocationTuple = useCallback((lat: number, lng: number): [number, number] => {
    return [lng, lat];
  }, []);
  
  // Determine initial center with proper typing
  const initialCenter = useMemo(() => {
    if (userLocation) {
      return createLocationTuple(userLocation.latitude, userLocation.longitude);
    }
    // Default to center of US if no location
    return [-98.5795, 39.8283] as [number, number];
  }, [userLocation, createLocationTuple]);

  // Initialize directions plugin when map loads
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapboxToken) return;

    // Initialize directions control
    if (!directionsRef.current) {
      directionsRef.current = new MapboxDirections({
        accessToken: mapboxToken,
        unit: 'imperial',
        profile: 'mapbox/driving',
        alternatives: true,
        geometries: 'geojson',
        controls: {
          inputs: true,
          instructions: true,
          profileSwitcher: true,
        },
        flyTo: true,
        placeholderOrigin: 'Choose starting point',
        placeholderDestination: 'Choose destination',
      });

      // Add the directions control to the map
      map.addControl(directionsRef.current, 'top-left');
      
      // Add navigation controls
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.addControl(new mapboxgl.FullscreenControl(), 'bottom-right');

      // Add route event listeners for integration with template system
      directionsRef.current.on('route', (event: any) => {
        if (onRouteUpdate && event.route && event.route.length > 0) {
          const route = event.route[0];
          const routeData = {
            origin: directionsRef.current?.getOrigin()?.geometry?.coordinates || startLocation || '',
            destination: directionsRef.current?.getDestination()?.geometry?.coordinates || endLocation || '',
            waypoints: [], // Will be populated with waypoints if available
            distance: Math.round(route.distance * 0.000621371), // Convert meters to miles
            duration: Math.round(route.duration / 86400) // Convert seconds to days
          };
          onRouteUpdate(routeData);
        }
      });

      // Handle origin and destination changes
      directionsRef.current.on('origin', (event: any) => {
        console.log('📍 Origin set:', event.feature?.place_name);
      });

      directionsRef.current.on('destination', (event: any) => {
        console.log('📍 Destination set:', event.feature?.place_name);
      });
    }

    return () => {
      // Cleanup on unmount
      if (directionsRef.current && map) {
        map.removeControl(directionsRef.current);
        directionsRef.current = null;
      }
    };
  }, [mapboxToken]);

  // Update directions when locations change
  useEffect(() => {
    if (!directionsRef.current) return;

    // Set origin if provided
    if (startLocation && startLocation.trim()) {
      directionsRef.current.setOrigin(startLocation);
    }

    // Set destination if provided
    if (endLocation && endLocation.trim()) {
      directionsRef.current.setDestination(endLocation);
    }
  }, [startLocation, endLocation]);

  if (!mapboxToken) {
    return (
      <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center border">
        <div className="text-center space-y-2">
          <div className="text-lg font-medium text-destructive">Mapbox Token Required</div>
          <div className="text-sm text-muted-foreground">
            Please configure VITE_MAPBOX_PUBLIC_TOKEN or VITE_MAPBOX_TOKEN in your environment
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border">
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: initialCenter[0],
          latitude: initialCenter[1],
          zoom: 10
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={onMapClick}
      />
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(TripMap);