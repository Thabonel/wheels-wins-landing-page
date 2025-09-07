import React, { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import './fresh-trip-planner.css';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { FreshMapOptionsControl } from './controls/FreshMapOptionsControl';
// Removed custom FreshFullscreenControl - using native Mapbox control instead
import { FreshTrackControl } from './controls/FreshTrackControl';
import FreshRouteToolbar from './components/FreshRouteToolbar';
import FreshStatusBar from './components/FreshStatusBar';
import FreshNavigationExport from './components/FreshNavigationExport';
import FreshPOILayer from './components/FreshPOILayer';
import FreshPOIPanel from './components/FreshPOIPanel';
import FreshGeocodeSearch from './components/FreshGeocodeSearch';
import FreshSaveTripDialog from './components/FreshSaveTripDialog';
import FreshTemplatesPanel from './components/FreshTemplatesPanel';
import BudgetSidebar from '../BudgetSidebar';
import SocialSidebar from '../SocialSidebar';
import { useSocialTripState } from '../hooks/useSocialTripState';

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
  initialTemplate?: any; // Support passing template directly
}

const FreshTripPlanner: React.FC<FreshTripPlannerProps> = ({
  onSaveTrip,
  onBack,
  initialTemplate
}) => {
  // State
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>('OUTDOORS');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMapStyle, setShowMapStyle] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showExportHub, setShowExportHub] = useState(false);
  const [showPOI, setShowPOI] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [poiFilters, setPOIFilters] = useState<Record<string, boolean>>({
    pet_stop: false,
    wide_parking: false,
    medical: false,
    farmers_market: false,
    fuel: false,
    camping: false,
    dump_station: false,
    water: false,
  });
  const trackControlRef = useRef<FreshTrackControl | null>(null);
  const mapOptionsControlRef = useRef<FreshMapOptionsControl | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isAddingWaypoint, setIsAddingWaypoint] = useState(false);
  const isAddingWaypointRef = useRef(false);
  const waypointsRef = useRef<any[]>([]);
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
  
  // Social state for social sidebar
  const socialState = useSocialTripState();
  
  // Mapbox Directions plugin - hidden UI, used as engine
  const directionsRef = useRef<MapboxDirections | null>(null);
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [routeProfile, setRouteProfile] = useState<'driving' | 'walking' | 'cycling'>('driving');
  
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
      
      // Add native Mapbox fullscreen control with container option
      // This ensures the entire trip planner (including toolbar) goes fullscreen
      const tripPlannerRoot = mapContainerRef.current?.closest('[data-trip-planner-root="true"]');
      newMap.addControl(new mapboxgl.FullscreenControl({
        container: tripPlannerRoot || undefined
      }), 'top-right');
      
      // Create track management control (but don't add to map - controlled by toolbar)
      const trackControl = new FreshTrackControl({
        waypoints: [],
        routeProfile: 'driving',
        rvServices: {},
        onRemoveWaypoint: (id: string) => {
          // Placeholder - will be updated via updateOptions
        },
        onSetRouteProfile: (profile: 'driving' | 'walking' | 'cycling') => {
          // Placeholder - will be updated via updateOptions
        },
        onRVServiceToggle: (service: string, enabled: boolean) => {
          setRvServices(prev => ({ ...prev, [service]: enabled }));
        }
      });
      // Initialize without adding to map controls
      if (typeof trackControl.initialize === 'function') {
        trackControl.initialize(newMap, mapContainerRef.current);
      } else {
        // Fallback for old implementation
        console.warn('TrackControl does not have initialize method, using as map control');
        newMap.addControl(trackControl as any, 'top-right');
      }
      trackControlRef.current = trackControl;
      
      // Create map options control and initialize it
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
      // Initialize without adding to map controls
      if (typeof mapOptionsControl.initialize === 'function') {
        mapOptionsControl.initialize(newMap, mapContainerRef.current);
      } else {
        // Fallback for old implementation
        console.warn('MapOptionsControl does not have initialize method, using as map control');
        newMap.addControl(mapOptionsControl as any, 'top-left');
      }
      mapOptionsControlRef.current = mapOptionsControl;
      
      // Store map instance
      mapRef.current = newMap;
      setMap(newMap);
      
      // Initialize Mapbox Directions plugin with hidden UI
      const directions = new MapboxDirections({
        accessToken: token,
        unit: 'imperial',
        profile: `mapbox/${routeProfile}`,
        alternatives: true,
        geometries: 'geojson',
        controls: {
          inputs: false,        // Hide search input boxes
          instructions: false,  // Hide turn-by-turn instructions
          profileSwitcher: false // Hide walking/driving/cycling buttons
        },
        flyTo: true,
        placeholderOrigin: 'Choose starting point',
        placeholderDestination: 'Choose destination',
        interactive: true // Enable native click-to-add and drag-to-modify
      });
      
      // Add the hidden directions control to the map
      newMap.addControl(directions, 'top-left');
      directionsRef.current = directions;
      
      // Set up event handlers for the directions plugin
      directions.on('route', (e: any) => {
        console.log('🗺️ Route calculated:', e);
        if (e.route && e.route.length > 0) {
          setCurrentRoute(e.route[0]);
          const routeWaypoints = [];
          
          // Get origin
          const origin = directions.getOrigin();
          if (origin) routeWaypoints.push(origin);
          
          // Get destination  
          const destination = directions.getDestination();
          if (destination) routeWaypoints.push(destination);
          
          setWaypoints(routeWaypoints);
          toast.success('Route calculated successfully!');
        }
      });
      
      directions.on('clear', () => {
        console.log('🗑️ Route cleared');
        setCurrentRoute(null);
        setWaypoints([]);
        setIsNavigating(false);
      });
      
      directions.on('origin', (e: any) => {
        console.log('📍 Origin set:', e.feature?.place_name);
        toast.success(`Start: ${e.feature?.place_name || 'Location set'}`);
      });
      
      directions.on('destination', (e: any) => {
        console.log('📍 Destination set:', e.feature?.place_name);
        toast.success(`End: ${e.feature?.place_name || 'Location set'}`);
      });
      
      // Map event handlers
      newMap.on('load', () => {
        console.log('🗺️ Map and directions loaded successfully');
      });
      
      newMap.on('error', (e) => {
        console.error('Map error:', e);
        if (e.error && e.error.message) {
          toast.error(`Map error: ${e.error.message}`);
        } else {
          toast.error('Map loading error - check console for details');
        }
      });
      
      // Plugin now handles clicks natively - no custom click handler needed
      
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
      if (trackControlRef.current && typeof trackControlRef.current.cleanup === 'function') {
        trackControlRef.current.cleanup();
        trackControlRef.current = null;
      }
      if (mapOptionsControlRef.current && typeof mapOptionsControlRef.current.cleanup === 'function') {
        mapOptionsControlRef.current.cleanup();
        mapOptionsControlRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Only run once on mount
  
  // Update track control callbacks when waypoint manager is ready
  useEffect(() => {
    if (trackControlRef.current && directionsRef.current) {
      trackControlRef.current.updateOptions({
        waypoints: waypoints,
        routeProfile: routeProfile,
        rvServices: rvServices,
        onRemoveWaypoint: (index: number) => {
          // Remove waypoint using directions plugin
          if (directionsRef.current) {
            const currentWaypoints = [...waypoints];
            currentWaypoints.splice(index, 1);
            setWaypoints(currentWaypoints);
            // Clear and rebuild route
            directionsRef.current.removeRoutes();
            if (currentWaypoints.length >= 2) {
              directionsRef.current.setOrigin(currentWaypoints[0].coordinates);
              directionsRef.current.setDestination(currentWaypoints[currentWaypoints.length - 1].coordinates);
            }
          }
        },
        onSetRouteProfile: (profile: 'driving' | 'walking' | 'cycling') => {
          setRouteProfile(profile);
          if (directionsRef.current) {
            directionsRef.current.options.profile = `mapbox/${profile}`;
            // Trigger route recalculation if we have waypoints
            if (waypoints.length >= 2) {
              directionsRef.current.removeRoutes();
              directionsRef.current.setOrigin(waypoints[0].coordinates);
              directionsRef.current.setDestination(waypoints[waypoints.length - 1].coordinates);
            }
          }
        },
        onRVServiceToggle: (service: string, enabled: boolean) => {
          setRvServices(prev => ({ ...prev, [service]: enabled }));
        }
      });
    }
  }, [waypoints, routeProfile, rvServices]);
  
  // Handle map style changes
  useEffect(() => {
    if (map) {
      map.setStyle(MAP_STYLES[mapStyle]);
    }
  }, [mapStyle, map]);
  
  // Sync isAddingWaypoint state with ref and manage cursor
  useEffect(() => {
    isAddingWaypointRef.current = isAddingWaypoint;
    
    // Update cursor style
    if (map) {
      const canvasContainer = map.getCanvasContainer();
      if (isAddingWaypoint) {
        canvasContainer.classList.add('waypoint-cursor');
        console.log('✅ Added waypoint-cursor class, state:', isAddingWaypoint);
      } else {
        canvasContainer.classList.remove('waypoint-cursor');
        console.log('❌ Removed waypoint-cursor class, state:', isAddingWaypoint);
      }
    }
  }, [isAddingWaypoint, map]);
  
  // Sync waypoints state with ref for use in event handlers
  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);
  
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
  
  // Updated handlers using directions plugin
  
  // Save trip handler
  const handleSaveTrip = async () => {
    if (waypoints.length < 2) {
      toast.error('Please add at least 2 waypoints');
      return;
    }
    
    if (!user) {
      toast.error('Please log in to save trips');
      return;
    }
    
    setShowSaveDialog(true);
  };
  
  // Share trip handler
  const handleExportRoute = () => {
    if (waypoints.length < 2) {
      toast.error('Add at least 2 waypoints to export a route');
      return;
    }
    setShowExportHub(true);
  };
  
  const handleShareTrip = () => {
    if (waypoints.length < 2) {
      toast.error('Please create a route first');
      return;
    }
    
    // Create shareable link or export data
    const shareData = {
      waypoints: waypoints,
      route: currentRoute
    };
    
    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(shareData, null, 2));
    toast.success('Route copied to clipboard');
  };
  
  // Navigation handler
  const handleStartNavigation = () => {
    if (waypoints.length < 2) {
      toast.error('Please create a route first');
      return;
    }
    
    setIsNavigating(!isNavigating);
    toast.info(isNavigating ? 'Navigation stopped' : 'Navigation started');
  };
  
  // Clear route handler
  const handleClearRoute = () => {
    if (directionsRef.current) {
      directionsRef.current.removeRoutes();
      directionsRef.current.setOrigin(null);
      directionsRef.current.setDestination(null);
    }
    toast.info('Route cleared');
  };
  
  // Search location handler
  const handleSearchLocation = () => {
    setShowSearch(true);
  };

  // Add waypoint button handler  
  const handleAddWaypointToggle = () => {
    const newState = !isAddingWaypoint;
    console.log('🖱️ Add waypoint button clicked. Changing state from', isAddingWaypoint, 'to', newState);
    
    setIsAddingWaypoint(newState);
    
    // Note: We'll handle click-to-add via manual map click handler
    // since the Mapbox Directions plugin interactive option is not easily toggleable
    
    if (newState) {
      toast.info('Click on the map to add a waypoint', { duration: 3000 });
    } else {
      toast.info('Waypoint adding mode disabled');
    }
  };
  
  // Handle location selection from search
  const handleLocationSelect = (coordinates: [number, number], name: string) => {
    // Add waypoint using directions plugin
    if (directionsRef.current) {
      const newWaypoint = {
        coordinates: coordinates,
        name: name,
        type: waypoints.length === 0 ? 'origin' : 
              waypoints.length === 1 ? 'destination' : 'waypoint'
      };
      
      // Update waypoints state
      const updatedWaypoints = [...waypoints, newWaypoint];
      setWaypoints(updatedWaypoints);
      
      // Set in directions plugin
      if (updatedWaypoints.length === 1) {
        directionsRef.current.setOrigin(coordinates);
      } else if (updatedWaypoints.length === 2) {
        directionsRef.current.setDestination(coordinates);
      }
    }
    
    toast.success(`Added ${name} to route`);
    setShowSearch(false);
  };
  
  // Handle template application
  const handleApplyTemplate = (template: any) => {
    // Clear existing waypoints
    if (directionsRef.current) {
      directionsRef.current.removeRoutes();
      directionsRef.current.setOrigin(null);
      directionsRef.current.setDestination(null);
    }
    setWaypoints([]);
    
    // Add template waypoints
    const templateWaypoints = template.waypoints.map((wp: any) => ({
      coordinates: wp.coordinates,
      name: wp.name,
      type: wp.type
    }));
    
    setWaypoints(templateWaypoints);
    
    // Set origin and destination in directions plugin
    if (directionsRef.current && templateWaypoints.length >= 2) {
      directionsRef.current.setOrigin(templateWaypoints[0].coordinates);
      directionsRef.current.setDestination(templateWaypoints[templateWaypoints.length - 1].coordinates);
    }
    
    // Fly to the first waypoint
    if (map && template.waypoints.length > 0) {
      map.flyTo({
        center: template.waypoints[0].coordinates,
        zoom: 8,
        duration: 2000
      });
    }
    
    toast.success(`Template "${template.name}" applied successfully`);
  };
  
  // Check for template from sessionStorage when component mounts
  useEffect(() => {
    const templateData = sessionStorage.getItem('selectedTripTemplate');
    if (templateData) {
      try {
        const template = JSON.parse(templateData);
        console.log('📦 Loading template from sessionStorage:', template.name);
        
        // Clear sessionStorage to prevent reloading on refresh
        sessionStorage.removeItem('selectedTripTemplate');
        
        // Wait for map to be ready before applying template
        if (map && directionsRef.current) {
          // Apply the template
          if (template.route) {
            const waypoints = [];
            
            // Add origin
            if (template.route.origin) {
              waypoints.push({
                name: template.route.origin.name,
                coordinates: template.route.origin.coords,
                type: 'origin'
              });
            }
            
            // Add waypoints
            if (template.route.waypoints) {
              template.route.waypoints.forEach((wp: any) => {
                waypoints.push({
                  name: wp.name,
                  coordinates: wp.coords,
                  type: 'waypoint'
                });
              });
            }
            
            // Add destination
            if (template.route.destination) {
              waypoints.push({
                name: template.route.destination.name,
                coordinates: template.route.destination.coords,
                type: 'destination'
              });
            }
            
            // Apply template with waypoints
            handleApplyTemplate({
              ...template,
              waypoints: waypoints
            });
          }
        }
      } catch (error) {
        console.error('Error loading template from sessionStorage:', error);
        toast.error('Failed to load template');
      }
    }
    
    // Also check for initialTemplate prop
    if (initialTemplate && map && directionsRef.current) {
      handleApplyTemplate(initialTemplate);
    }
  }, [map, directionsRef.current, initialTemplate]);
  
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
        onUndo={() => toast.info('Undo/redo coming soon')}
        onRedo={() => toast.info('Undo/redo coming soon')}
        canUndo={false}
        canRedo={false}
        onAddWaypoint={handleAddWaypointToggle}
        onClearRoute={handleClearRoute}
        onSaveTrip={handleSaveTrip}
        onShareTrip={handleShareTrip}
        onExportRoute={handleExportRoute}
        onSearchLocation={handleSearchLocation}
        onToggleTemplates={() => setShowTemplates(!showTemplates)}
        onStartNavigation={handleStartNavigation}
        isNavigating={isNavigating}
        onToggleTraffic={() => setShowTraffic(!showTraffic)}
        showTraffic={showTraffic}
        onToggleSidebar={() => {
          setShowSidebar(prev => {
            const newState = !prev;
            if (trackControlRef.current) {
              if (newState) {
                trackControlRef.current.openPanel();
              } else {
                trackControlRef.current.closePanel();
              }
            }
            return newState;
          });
        }}
        showSidebar={showSidebar}
        onToggleMapStyle={() => {
          setShowMapStyle(prev => {
            const newState = !prev;
            // Toggle the map options dropdown
            if (mapOptionsControlRef.current) {
              if (newState) {
                mapOptionsControlRef.current.openDropdown();
              } else {
                mapOptionsControlRef.current.closeDropdown();
              }
            }
            return newState;
          });
        }}
        showMapStyle={showMapStyle}
        onToggleBudget={() => setShowBudget(!showBudget)}
        showBudget={showBudget}
        onToggleSocial={() => setShowSocial(!showSocial)}
        showSocial={showSocial}
        onTogglePOI={() => setShowPOI(!showPOI)}
        showPOI={showPOI}
        showTemplates={showTemplates}
        isAddingWaypoint={isAddingWaypoint}
        hasRoute={waypoints.length >= 2}
      />
      
      {/* Add waypoint indicator */}
      {isAddingWaypoint && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Click on the map to add a waypoint
        </div>
      )}
      
      {/* POI Layer */}
      <FreshPOILayer 
        map={map} 
        filters={poiFilters} 
      />
      
      {/* POI Panel */}
      <FreshPOIPanel
        isOpen={showPOI}
        onClose={() => setShowPOI(false)}
        filters={poiFilters}
        onFilterChange={(category, enabled) => {
          setPOIFilters(prev => ({ ...prev, [category]: enabled }));
        }}
      />
      
      {/* Status bar overlay */}
      <FreshStatusBar
        route={currentRoute}
        isNavigating={isNavigating}
        onStartNavigation={handleStartNavigation}
        onStopNavigation={() => setIsNavigating(false)}
      />
      
      {/* Budget Sidebar - positioned on left side */}
      {showBudget && (
        <div 
          className="absolute top-20 left-2 z-[10001] max-w-[400px] w-full sm:w-[400px]"
          style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}
        >
          <BudgetSidebar
            isVisible={showBudget}
            onClose={() => setShowBudget(false)}
            waypoints={waypoints.map((wp, index) => ({
              coords: wp.coordinates,
              name: wp.name || `Waypoint ${index + 1}`
            }))}
          />
        </div>
      )}
      
      {/* Social Sidebar - positioned on right side */}
      {showSocial && (
        <div 
          className="absolute top-20 right-2 z-[10001] max-w-[320px] w-full sm:w-[320px]"
          style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}
        >
          <SocialSidebar
            isOpen={showSocial}
            onClose={() => setShowSocial(false)}
            friends={socialState.friends}
            calendarEvents={socialState.calendarEvents}
            groupTrips={socialState.groupTrips}
            onMessageFriend={(friend) => {
              console.log('Message friend:', friend);
              // TODO: Implement messaging
            }}
            onOpenMeetupPlanner={() => {
              console.log('Open meetup planner');
              // TODO: Implement meetup planner
            }}
          />
        </div>
      )}
      
      {/* Navigation Export Hub */}
      <FreshNavigationExport
        isOpen={showExportHub}
        onClose={() => setShowExportHub(false)}
        currentRoute={waypoints.length >= 2 ? {
          origin: {
            name: waypoints[0]?.name || 'Start',
            lat: waypoints[0]?.coordinates[1],
            lng: waypoints[0]?.coordinates[0]
          },
          destination: {
            name: waypoints[waypoints.length - 1]?.name || 'End',
            lat: waypoints[waypoints.length - 1]?.coordinates[1],
            lng: waypoints[waypoints.length - 1]?.coordinates[0]
          },
          waypoints: waypoints.slice(1, -1).map(wp => ({
            name: wp.name || 'Waypoint',
            lat: wp.coordinates[1],
            lng: wp.coordinates[0]
          }))
        } : null}
      />
      
      {/* Geocode Search Panel */}
      <FreshGeocodeSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onLocationSelect={handleLocationSelect}
        map={map}
      />
      
      {/* Templates Panel */}
      <FreshTemplatesPanel
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onApplyTemplate={handleApplyTemplate}
      />
      
      {/* Save Trip Dialog */}
      <FreshSaveTripDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        tripData={{
          waypoints: waypoints,
          route: currentRoute,
          profile: routeProfile,
          distance: currentRoute?.distance,
          duration: currentRoute?.duration
        }}
        onSaveSuccess={(savedTrip) => {
          console.log('Trip saved:', savedTrip);
          if (onSaveTrip) {
            onSaveTrip(savedTrip);
          }
        }}
      />
    </div>
  );
};

export default FreshTripPlanner;