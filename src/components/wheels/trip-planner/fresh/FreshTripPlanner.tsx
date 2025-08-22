import React, { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { toast } from 'sonner';
import { useFreshWaypointManager } from './hooks/useFreshWaypointManager';
import { useAuth } from '@/context/AuthContext';
import { FreshMapOptionsControl } from './controls/FreshMapOptionsControl';
import FreshRouteToolbar from './components/FreshRouteToolbar';
import MapboxDebugComponent from '@/components/debug/MapboxDebugComponent';

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
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>('AUSTRALIA_OFFROAD');
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
    
    // Check for Mapbox token using the utility function
    const publicToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    const legacyToken = import.meta.env.VITE_MAPBOX_TOKEN;
    
    console.log('🔍 Mapbox Token Debug:', {
      publicTokenExists: !!publicToken,
      legacyTokenExists: !!legacyToken,
      publicTokenPreview: publicToken ? `${publicToken.substring(0, 7)}...${publicToken.substring(publicToken.length - 4)}` : 'not set',
      legacyTokenPreview: legacyToken ? `${legacyToken.substring(0, 7)}...${legacyToken.substring(legacyToken.length - 4)}` : 'not set',
    });
    
    const token = publicToken || legacyToken;
    
    if (!token) {
      toast.error('Mapbox token not configured. Please set VITE_MAPBOX_PUBLIC_TOKEN in Netlify environment variables.');
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
    console.log('✅ Mapbox token set successfully');
    
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
    <div className="relative w-full h-full overflow-hidden">
      {/* Full-screen map container */}
      <div ref={mapContainerRef} className="absolute inset-0" />
      
      {/* Debug component */}
      <MapboxDebugComponent />
      
      
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
      
      
      {/* Right side: Track management panel (sliding) */}
      <div className={`absolute top-16 right-4 bottom-4 w-80 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg transition-transform duration-300 ${showSidebar ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'}`}>
        <div className="h-full overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-lg">Track Management</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {/* Waypoints section */}
            <div className="mb-6">
              <h4 className="font-medium text-sm text-gray-700 mb-2">Waypoints ({waypointManager.waypoints.length})</h4>
              {waypointManager.waypoints.length === 0 ? (
                <p className="text-sm text-gray-500">Click the map to add waypoints</p>
              ) : (
                <div className="space-y-2">
                  {waypointManager.waypoints.map((waypoint, index) => (
                    <div key={waypoint.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{index + 1}. {waypoint.name}</span>
                      <button
                        onClick={() => waypointManager.removeWaypoint(waypoint.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Route profile selector */}
            <div className="mb-6">
              <h4 className="font-medium text-sm text-gray-700 mb-2">Route Profile</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => waypointManager.setRouteProfile('driving')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    waypointManager.routeProfile === 'driving' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Drive
                </button>
                <button
                  onClick={() => waypointManager.setRouteProfile('cycling')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    waypointManager.routeProfile === 'cycling' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bike
                </button>
                <button
                  onClick={() => waypointManager.setRouteProfile('walking')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    waypointManager.routeProfile === 'walking' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Walk
                </button>
              </div>
            </div>
            
            {/* RV Services */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">RV Services</h4>
              <div className="space-y-1">
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>RV Parks</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Campgrounds</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Dump Stations</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Propane</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add waypoint indicator */}
      {isAddingWaypoint && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Click on the map to add a waypoint
        </div>
      )}
      
      {/* Bottom status bar */}
      {waypointManager.currentRoute && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Route Information</div>
              <div className="text-xs text-gray-600 mt-1">
                Distance: {(waypointManager.currentRoute.distance / 1000).toFixed(1)} km • 
                Duration: {Math.round(waypointManager.currentRoute.duration / 60)} min
              </div>
            </div>
            <button
              onClick={handleStartNavigation}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isNavigating 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isNavigating ? 'Stop Navigation' : 'Start Navigation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreshTripPlanner;