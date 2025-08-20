import React, { useState, useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapOptions from './MapOptions';
import TrackManagement from './TrackManagement';
import RoutePlanning from './RoutePlanning';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { 
  fetchRoute, 
  addRouteToMap, 
  fitMapToRoute,
  geocodeLocation,
  formatRouteInfo
} from './utils/mapRouteUtils';
import { 
  addRouteMarkers, 
  createDraggableWaypoint,
  clearMarkers
} from './utils/mapMarkerUtils';

interface EnhancedMapProps {
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

const EnhancedMap: React.FC<EnhancedMapProps> = ({
  startLocation,
  endLocation,
  waypoints = [],
  onMapClick,
  userLocation,
  currentRoute
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [showTrackManagement, setShowTrackManagement] = useState(false);
  const [waypointCount, setWaypointCount] = useState(waypoints.length);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [overlaysState, setOverlaysState] = useState({
    traffic: false,
    fires: false,
    phone: false,
    parks: false,
    forests: false
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Check for Mapbox token
    const token = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (!token) {
      console.warn('Mapbox token not found - showing placeholder map');
      return;
    }

    mapboxgl.accessToken = token;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: userLocation 
        ? [userLocation.longitude, userLocation.latitude]
        : [-98.5795, 39.8283], // Default to center of US
      zoom: 10
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add user location control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    return () => {
      map.current?.remove();
    };
  }, [userLocation]);

  // Load and display route when locations change
  useEffect(() => {
    const loadRoute = async () => {
      if (!map.current || !startLocation || !endLocation) return;
      
      setIsLoadingRoute(true);
      
      try {
        // Clear existing markers
        clearMarkers(map.current);
        markersRef.current = [];
        
        // Geocode start and end locations
        const [startCoords, endCoords] = await Promise.all([
          geocodeLocation(startLocation),
          geocodeLocation(endLocation)
        ]);
        
        if (!startCoords || !endCoords) {
          console.error('Could not geocode locations');
          setIsLoadingRoute(false);
          return;
        }
        
        // Add route markers
        const { startMarker, endMarker } = addRouteMarkers(
          map.current,
          { coords: startCoords, name: startLocation },
          { coords: endCoords, name: endLocation }
        );
        markersRef.current.push(startMarker, endMarker);
        
        // Process waypoints if any
        const waypointCoords: [number, number][] = [];
        if (waypoints.length > 0) {
          for (let i = 0; i < waypoints.length; i++) {
            const coords = await geocodeLocation(waypoints[i]);
            if (coords) {
              waypointCoords.push(coords);
              const marker = createDraggableWaypoint(
                map.current,
                coords,
                i,
                (newCoords) => {
                  console.log(`Waypoint ${i + 1} moved to:`, newCoords);
                  // Here you would update the waypoint in state
                }
              );
              markersRef.current.push(marker);
            }
          }
        }
        
        // Fetch and display route
        const route = await fetchRoute(startCoords, endCoords, {
          waypoints: waypointCoords,
          profile: 'driving'
        });
        
        if (route) {
          addRouteToMap(map.current, route);
          fitMapToRoute(map.current, route, 100);
          
          const info = formatRouteInfo(route);
          setRouteInfo(info);
        }
      } catch (error) {
        console.error('Error loading route:', error);
      } finally {
        setIsLoadingRoute(false);
      }
    };
    
    // Debounce the route loading
    const timer = setTimeout(loadRoute, 500);
    return () => clearTimeout(timer);
  }, [startLocation, endLocation, waypoints]);

  // Handle style changes
  const handleStyleChange = useCallback((style: string) => {
    if (!map.current) return;
    
    const styleMap: { [key: string]: string } = {
      'satellite': 'mapbox://styles/mapbox/satellite-streets-v12',
      'outdoors': 'mapbox://styles/mapbox/outdoors-v12',
      'navigation': 'mapbox://styles/mapbox/navigation-day-v1',
      'streets': 'mapbox://styles/mapbox/streets-v12'
    };

    map.current.setStyle(styleMap[style] || styleMap['streets']);
  }, []);

  // Handle overlay toggles
  const handleOverlayToggle = useCallback((overlay: string, enabled: boolean) => {
    setOverlaysState(prev => ({ ...prev, [overlay]: enabled }));
    
    if (!map.current) return;

    // Here you would add/remove the actual overlay layers
    // This is a placeholder for the overlay logic
    console.log(`Toggling ${overlay} overlay: ${enabled}`);
    
    if (overlay === 'traffic' && map.current.getStyle()) {
      // Toggle traffic layer
      const visibility = enabled ? 'visible' : 'none';
      const layers = ['traffic-heat', 'traffic-flow'];
      layers.forEach(layerId => {
        if (map.current?.getLayer(layerId)) {
          map.current.setLayoutProperty(layerId, 'visibility', visibility);
        }
      });
    }
  }, []);

  // Handle route operations
  const handleAddWaypoint = useCallback(() => {
    setWaypointCount(prev => prev + 1);
    // Here you would add actual waypoint logic
  }, []);

  const handleClearRoute = useCallback(() => {
    setWaypointCount(0);
    // Here you would clear the actual route
  }, []);

  const handleCenterUser = useCallback(() => {
    if (!map.current) return;
    
    if (userLocation) {
      map.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 14
      });
    } else {
      // Try to get user's location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.current?.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 14
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, [userLocation]);

  const handleModeChange = useCallback((mode: 'driving' | 'rv' | 'offroad') => {
    console.log('Route mode changed to:', mode);
    // Here you would update the routing profile
  }, []);

  const handleTrackSelect = useCallback((track: any) => {
    console.log('Track selected:', track);
    // Here you would load the selected track onto the map
  }, []);

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden bg-gray-100">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Left Panel - Map Options and Route Planning */}
      <div className="absolute top-4 left-4 z-10 space-y-3">
        <MapOptions 
          onStyleChange={handleStyleChange}
          onOverlayToggle={handleOverlayToggle}
          overlaysState={overlaysState}
        />
        
        <RoutePlanning
          onModeChange={handleModeChange}
          onAddWaypoint={handleAddWaypoint}
          onClearRoute={handleClearRoute}
          onCenterUser={handleCenterUser}
          waypointCount={waypointCount}
          distance={routeInfo?.distance}
          duration={routeInfo?.duration}
        />
      </div>

      {/* Loading indicator */}
      {isLoadingRoute && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2">
            <span className="text-sm">Calculating route...</span>
          </div>
        </div>
      )}

      {/* Right Panel - Track Management (Always visible) */}
      <div className="absolute top-4 right-4 z-10 h-[calc(100%-2rem)]">
        <TrackManagement
          onTrackSelect={handleTrackSelect}
          onUpload={() => console.log('Upload track')}
          currentRoute={currentRoute}
          waypoints={waypoints.map((w, i) => ({ name: w || `Waypoint ${i + 1}`, coords: [0, 0] }))}
          tripName={startLocation && endLocation ? `${startLocation} to ${endLocation}` : 'My RV Trip'}
        />
      </div>

      {/* Fallback if no Mapbox token */}
      {!import.meta.env.VITE_MAPBOX_TOKEN && !import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="text-lg font-medium">Map View</div>
            <div className="text-sm text-muted-foreground">
              {startLocation && endLocation ? (
                `Route: ${startLocation} → ${endLocation}`
              ) : (
                'Enter start and end locations to see route'
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMap;