import React, { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';
import { useFreshWaypointManager } from './hooks/useFreshWaypointManager';
import FreshTripToolbar from './components/FreshTripToolbar';
import FreshTripSidebar from './components/FreshTripSidebar';
import { useAuth } from '@/context/AuthContext';

// Map styles configuration
const MAP_STYLES = {
  STREETS: 'mapbox://styles/mapbox/streets-v12',
  OUTDOORS: 'mapbox://styles/mapbox/outdoors-v12',
  SATELLITE: 'mapbox://styles/mapbox/satellite-v9',
  SATELLITE_STREETS: 'mapbox://styles/mapbox/satellite-streets-v12',
} as const;

interface FreshTripPlannerProps {
  onSaveTrip?: (tripData: any) => void;
  onBack?: () => void;
}

const FreshTripPlanner: React.FC<FreshTripPlannerProps> = ({
  onSaveTrip,
  onBack
}) => {
  // State
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>('OUTDOORS');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isAddingWaypoint, setIsAddingWaypoint] = useState(false);
  
  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  
  // Hooks
  const { user } = useAuth();
  
  // Waypoint manager with working undo/redo
  const waypointManager = useFreshWaypointManager({
    map,
    onRouteUpdate: (waypoints, route) => {
      console.log('Route updated:', waypoints.length, 'waypoints');
    }
  });
  
  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    // Check for Mapbox token
    const token = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (!token) {
      toast.error('Mapbox token not configured');
      return;
    }
    
    mapboxgl.accessToken = token;
    
    // Check WebGL support
    if (!mapboxgl.supported()) {
      toast.error('Your browser does not support WebGL');
      return;
    }
    
    try {
      const newMap = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES[mapStyle],
        center: [-98.5795, 39.8283], // Center of USA
        zoom: 4,
        pitch: 0,
        bearing: 0
      });
      
      // Add navigation controls
      newMap.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Add scale control
      newMap.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
      
      // Add geolocate control
      const geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      });
      newMap.addControl(geolocateControl, 'top-right');
      
      // Store map instance
      mapRef.current = newMap;
      setMap(newMap);
      
      // Map event handlers
      newMap.on('load', () => {
        toast.success('Map loaded successfully');
        
        // Enable map clicking to add waypoints
        newMap.on('click', (e) => {
          if (isAddingWaypoint) {
            handleMapClick(e);
          }
        });
      });
      
      newMap.on('error', (e) => {
        console.error('Map error:', e);
        toast.error('Map loading error');
      });
      
    } catch (error) {
      console.error('Failed to initialize map:', error);
      toast.error('Failed to initialize map');
    }
    
    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Only run once on mount
  
  // Handle map style changes
  useEffect(() => {
    if (map) {
      map.setStyle(MAP_STYLES[mapStyle]);
    }
  }, [mapStyle, map]);
  
  // Handle traffic layer
  useEffect(() => {
    if (!map) return;
    
    const handleStyleLoad = () => {
      if (showTraffic) {
        if (!map.getLayer('traffic')) {
          map.addLayer({
            id: 'traffic',
            type: 'line',
            source: {
              type: 'vector',
              url: 'mapbox://mapbox.mapbox-traffic-v1'
            },
            'source-layer': 'traffic',
            paint: {
              'line-color': [
                'case',
                ['==', ['get', 'congestion'], 'low'], '#00ff00',
                ['==', ['get', 'congestion'], 'moderate'], '#ffff00',
                ['==', ['get', 'congestion'], 'heavy'], '#ff8800',
                ['==', ['get', 'congestion'], 'severe'], '#ff0000',
                '#000000'
              ],
              'line-width': 3
            }
          });
        }
      } else {
        if (map.getLayer('traffic')) {
          map.removeLayer('traffic');
        }
      }
    };
    
    map.on('style.load', handleStyleLoad);
    handleStyleLoad(); // Call immediately in case style is already loaded
    
    return () => {
      map.off('style.load', handleStyleLoad);
    };
  }, [showTraffic, map]);
  
  // Handle map click to add waypoint
  const handleMapClick = async (e: mapboxgl.MapLayerMouseEvent) => {
    const { lng, lat } = e.lngLat;
    
    try {
      // Reverse geocode to get address
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();
      
      const placeName = data.features?.[0]?.place_name || `Location (${lng.toFixed(4)}, ${lat.toFixed(4)})`;
      const address = data.features?.[0]?.properties?.address || '';
      
      // Add waypoint
      waypointManager.addWaypoint({
        name: placeName,
        coordinates: [lng, lat],
        address: address,
        type: waypointManager.waypoints.length === 0 ? 'origin' : 
              waypointManager.waypoints.length === 1 ? 'destination' : 'waypoint'
      });
      
      toast.success('Waypoint added');
      setIsAddingWaypoint(false);
    } catch (error) {
      console.error('Error adding waypoint:', error);
      toast.error('Failed to add waypoint');
    }
  };
  
  // Save trip handler
  const handleSaveTrip = async () => {
    if (waypointManager.waypoints.length < 2) {
      toast.error('Please add at least 2 waypoints');
      return;
    }
    
    const tripData = {
      waypoints: waypointManager.waypoints,
      route: waypointManager.currentRoute,
      profile: waypointManager.routeProfile,
      userId: user?.id,
      createdAt: new Date().toISOString()
    };
    
    if (onSaveTrip) {
      await onSaveTrip(tripData);
      toast.success('Trip saved successfully');
    }
  };
  
  // Share trip handler
  const handleShareTrip = () => {
    if (waypointManager.waypoints.length < 2) {
      toast.error('Please create a route first');
      return;
    }
    
    // Create shareable link or export data
    const shareData = {
      waypoints: waypointManager.waypoints,
      route: waypointManager.currentRoute
    };
    
    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(shareData, null, 2));
    toast.success('Route copied to clipboard');
  };
  
  // Navigation handler
  const handleStartNavigation = () => {
    if (waypointManager.waypoints.length < 2) {
      toast.error('Please create a route first');
      return;
    }
    
    setIsNavigating(!isNavigating);
    toast.info(isNavigating ? 'Navigation stopped' : 'Navigation started');
  };
  
  // Clear route handler
  const handleClearRoute = () => {
    waypointManager.clearWaypoints();
    toast.info('Route cleared');
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toolbar */}
      <FreshTripToolbar
        onUndo={waypointManager.undo}
        onRedo={waypointManager.redo}
        canUndo={waypointManager.canUndo}
        canRedo={waypointManager.canRedo}
        onSave={handleSaveTrip}
        onShare={handleShareTrip}
        onClearRoute={handleClearRoute}
        onStartNavigation={handleStartNavigation}
        onToggleTraffic={() => setShowTraffic(!showTraffic)}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onAddWaypoint={() => setIsAddingWaypoint(!isAddingWaypoint)}
        showTraffic={showTraffic}
        isNavigating={isNavigating}
        isAddingWaypoint={isAddingWaypoint}
        hasRoute={waypointManager.waypoints.length >= 2}
      />
      
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map container */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full" />
          
          {/* Map style selector */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2">
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value as keyof typeof MAP_STYLES)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="STREETS">Streets</option>
              <option value="OUTDOORS">Outdoors</option>
              <option value="SATELLITE">Satellite</option>
              <option value="SATELLITE_STREETS">Satellite Streets</option>
            </select>
          </div>
          
          {/* Add waypoint indicator */}
          {isAddingWaypoint && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
              Click on the map to add a waypoint
            </div>
          )}
          
          {/* Route info */}
          {waypointManager.currentRoute && (
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
              <div className="text-sm font-medium">Route Information</div>
              <div className="text-xs text-gray-600 mt-1">
                Distance: {(waypointManager.currentRoute.distance / 1000).toFixed(1)} km
              </div>
              <div className="text-xs text-gray-600">
                Duration: {Math.round(waypointManager.currentRoute.duration / 60)} min
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        {showSidebar && (
          <FreshTripSidebar
            waypoints={waypointManager.waypoints}
            onRemoveWaypoint={waypointManager.removeWaypoint}
            onReorderWaypoints={waypointManager.reorderWaypoints}
            onClearAll={waypointManager.clearWaypoints}
            routeProfile={waypointManager.routeProfile}
            onRouteProfileChange={waypointManager.setRouteProfile}
            currentRoute={waypointManager.currentRoute}
            isLoadingRoute={waypointManager.isLoadingRoute}
          />
        )}
      </div>
    </div>
  );
};

export default FreshTripPlanner;