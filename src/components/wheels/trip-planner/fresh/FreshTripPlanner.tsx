import React, { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './fresh-trip-planner.css';
import { toast } from 'sonner';
import { useFreshWaypointManager } from './hooks/useFreshWaypointManager';
import { useAuth } from '@/context/AuthContext';
import { FreshMapOptionsControl } from './controls/FreshMapOptionsControl';
import { FreshFullscreenControl } from './controls/FreshFullscreenControl';
import FreshRouteToolbar from './components/FreshRouteToolbar';
import FreshTrackPanel from './components/FreshTrackPanel';
import FreshStatusBar from './components/FreshStatusBar';

// Map styles configuration
const MAP_STYLES = {
  AUSTRALIA_OFFROAD: 'mapbox://styles/thabonel/cm5ddi89k002301s552zx2fyc',
  OUTDOORS: 'mapbox://styles/mapbox/outdoors-v12',
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12',
  NAVIGATION: 'mapbox://styles/mapbox/navigation-day-v1',
  STREETS: 'mapbox://styles/mapbox/streets-v12',
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
  const [mapOverlays, setMapOverlays] = useState([
    { id: 'traffic', name: 'Traffic', enabled: false },
    { id: 'fires', name: 'Active Fires', enabled: false },
    { id: 'coverage', name: 'Phone Coverage', enabled: false },
    { id: 'parks', name: 'National Parks', enabled: false },
    { id: 'forests', name: 'State Forests', enabled: false },
  ]);
  const [rvServices, setRvServices] = useState({
    rvParks: false,
    campgrounds: false,
    dumpStations: false,
    propane: false,
    waterFill: false,
    rvRepair: false
  });
  
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
    
    // Check for Mapbox token - try multiple env vars
    const mainToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN_MAIN;
    const publicToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    const legacyToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const token = mainToken || publicToken || legacyToken;
    
    if (!token) {
      toast.error('Mapbox token not configured. Please set VITE_MAPBOX_PUBLIC_TOKEN_MAIN in Netlify environment variables.');
      return;
    }
    
    // Validate token type
    if (token.startsWith('sk.')) {
      toast.error('Invalid token type: Please use a public token (pk.*) not a secret token (sk.*) for frontend map rendering.');
      console.error('❌ Mapbox Error: Secret token detected. Frontend requires public token (pk.*) for security.');
      return;
    }
    
    if (!token.startsWith('pk.')) {
      toast.error('Invalid Mapbox token format. Token must start with "pk."');
      console.error('❌ Invalid token format:', token.substring(0, 10));
      return;
    }
    
    // Validate token structure
    if (!token.includes('.') || token.length < 50) {
      toast.error('Mapbox token appears to be malformed or truncated');
      console.error('❌ Token validation failed - length:', token.length);
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
        center: [133.7751, -25.2744], // Center of Australia
        zoom: 4,
        pitch: 0,
        bearing: 0,
        attributionControl: true,
        preserveDrawingBuffer: true // Helps with rendering issues
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
      
      // Add fullscreen control (positioned below geolocate)
      const fullscreenControl = new FreshFullscreenControl();
      newMap.addControl(fullscreenControl, 'top-right');
      
      // Add map options control
      const mapOptionsControl = new FreshMapOptionsControl({
        currentStyle: MAP_STYLES[mapStyle],
        onStyleChange: (style: string) => {
          newMap.setStyle(style);
          // Update state to match the new style
          const styleKey = Object.entries(MAP_STYLES).find(([_, value]) => value === style)?.[0];
          if (styleKey) {
            setMapStyle(styleKey as keyof typeof MAP_STYLES);
          }
        },
        onOverlayToggle: (overlayId: string, enabled: boolean) => {
          setMapOverlays(prev => prev.map(overlay => 
            overlay.id === overlayId ? { ...overlay, enabled } : overlay
          ));
          
          // Handle specific overlay toggles
          if (overlayId === 'traffic') {
            setShowTraffic(enabled);
          }
          // TODO: Implement other overlay handlers (fires, coverage, parks, forests)
        },
        overlays: mapOverlays
      });
      newMap.addControl(mapOptionsControl, 'top-left');
      
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
        if (e.error && e.error.message) {
          toast.error(`Map error: ${e.error.message}`);
        } else {
          toast.error('Map loading error - check console for details');
        }
      });
      
    } catch (error) {
      console.error('Failed to initialize map:', error);
      toast.error('Failed to initialize map. Trying fallback style...');
      
      // Try with a fallback style
      try {
        const fallbackMap = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: MAP_STYLES.STREETS, // Use streets as fallback
          center: [133.7751, -25.2744],
          zoom: 4,
          pitch: 0,
          bearing: 0
        });
        
        // Add basic controls
        fallbackMap.addControl(new mapboxgl.NavigationControl(), 'top-right');
        fallbackMap.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
        
        mapRef.current = fallbackMap;
        setMap(fallbackMap);
        toast.info('Using fallback map style');
        
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        toast.error('Unable to load map. Please check your internet connection.');
      }
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
    <div className="relative w-full h-full overflow-hidden" data-trip-planner-root="true">
      {/* Full-screen map container - ensure it has explicit height */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 w-full h-full" 
        style={{ minHeight: '500px' }}
      />
      
      {/* Route planning toolbar */}
      <FreshRouteToolbar
        onUndo={waypointManager.undo}
        onRedo={waypointManager.redo}
        canUndo={waypointManager.canUndo}
        canRedo={waypointManager.canRedo}
        onAddWaypoint={() => setIsAddingWaypoint(!isAddingWaypoint)}
        onClearRoute={handleClearRoute}
        onSaveTrip={handleSaveTrip}
        onShareTrip={handleShareTrip}
        onStartNavigation={handleStartNavigation}
        isNavigating={isNavigating}
        onToggleTraffic={() => setShowTraffic(!showTraffic)}
        showTraffic={showTraffic}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        showSidebar={showSidebar}
        isAddingWaypoint={isAddingWaypoint}
        hasRoute={waypointManager.waypoints.length >= 2}
      />
      
      
      {/* Track management panel overlay */}
      <FreshTrackPanel
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        waypoints={waypointManager.waypoints}
        onRemoveWaypoint={waypointManager.removeWaypoint}
        routeProfile={waypointManager.routeProfile}
        onSetRouteProfile={waypointManager.setRouteProfile}
        onRVServiceToggle={(service, enabled) => {
          setRvServices(prev => ({ ...prev, [service]: enabled }));
        }}
        rvServices={rvServices}
      />
      
      {/* Add waypoint indicator */}
      {isAddingWaypoint && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Click on the map to add a waypoint
        </div>
      )}
      
      {/* Status bar overlay */}
      <FreshStatusBar
        route={waypointManager.currentRoute}
        isNavigating={isNavigating}
        onStartNavigation={handleStartNavigation}
        onStopNavigation={() => setIsNavigating(false)}
      />
    </div>
  );
};

export default FreshTripPlanner;