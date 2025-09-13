import React, { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import './fresh-trip-planner.css';
import { toast } from 'sonner';
import { useFreshWaypointManager } from './hooks/useFreshWaypointManager';
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
import FreshRouteComparison from './components/FreshRouteComparison';
import FreshElevationProfile from './components/FreshElevationProfile';
import FreshDraggableWaypoints from './components/FreshDraggableWaypoints';
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
  const [showRouteComparison, setShowRouteComparison] = useState(false);
  const [showElevationProfile, setShowElevationProfile] = useState(false);
  const [showWaypointsManager, setShowWaypointsManager] = useState(false);
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
  const [hasDirectionsRoute, setHasDirectionsRoute] = useState(false);
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
  const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const directionsRef = useRef<MapboxDirections | null>(null);
  
  // Hooks
  const { user } = useAuth();
  
  // User profile state for vehicle-specific recommendations
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Load user profile for vehicle-specific routing advice
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        // Use the same approach as PAM WebSocket handlers
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          // Extract vehicle info similar to LoadUserProfileTool
          const vehicleInfo = {
            type: profile.vehicle_type || 'Standard Vehicle',
            make_model_year: profile.make_model_year || '',
            fuel_type: profile.fuel_type || 'petrol',
            enhanced_type: profile.vehicle_type?.toLowerCase().includes('unimog') ? 'Unimog RV' :
                          profile.vehicle_type === '4 x 4' ? '4WD RV' :
                          profile.vehicle_type || 'Standard Vehicle'
          };
          
          setUserProfile({
            vehicle_info: vehicleInfo,
            travel_preferences: {
              style: profile.travel_style || 'balanced',
              region: profile.region || 'Australia'
            }
          });
          
          console.log('🚐 User profile loaded for trip planner:', vehicleInfo);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };
    
    loadUserProfile();
  }, [user?.id]);
  
  // Social state for social sidebar
  const socialState = useSocialTripState();
  
  // Waypoint manager with working undo/redo
  const waypointManager = useFreshWaypointManager({
    map,
    onRouteUpdate: (waypoints, route) => {
      console.log('Route updated:', waypoints.length, 'waypoints');
      // Update track control with new waypoints
      if (trackControlRef.current) {
        trackControlRef.current.updateOptions({
          waypoints,
          routeProfile: waypointManager.routeProfile,
          rvServices
        });
      }
    }
  });
  
  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    // Check for Mapbox token - try multiple env vars for backward compatibility
    const mainToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN_MAIN;
    const publicToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    const legacyToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const token = mainToken || publicToken || legacyToken;
    
    // Debug logging to help diagnose environment variable issues
    console.log('🗺️ Mapbox Token Debug:', {
      hasMainToken: !!mainToken,
      hasPublicToken: !!publicToken, 
      hasLegacyToken: !!legacyToken,
      tokenSelected: token ? `${token.substring(0, 8)}...` : 'none',
      envVarsChecked: ['VITE_MAPBOX_PUBLIC_TOKEN_MAIN', 'VITE_MAPBOX_PUBLIC_TOKEN', 'VITE_MAPBOX_TOKEN']
    });
    
    if (!token) {
      const errorMsg = 'Mapbox token not configured. Please set one of: VITE_MAPBOX_PUBLIC_TOKEN_MAIN, VITE_MAPBOX_PUBLIC_TOKEN, or VITE_MAPBOX_TOKEN in your environment variables.';
      toast.error(errorMsg);
      console.error('❌ Mapbox Token Error:', errorMsg);
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
      
      // Add geolocate control only if not already created
      if (!geolocateControlRef.current) {
        geolocateControlRef.current = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true,
          showAccuracyCircle: true // Show the accuracy circle
        });
        newMap.addControl(geolocateControlRef.current, 'top-right');
      }
      
      // Add native Mapbox fullscreen control with container option
      // This ensures the entire trip planner (including toolbar) goes fullscreen
      const tripPlannerRoot = mapContainerRef.current?.closest('[data-trip-planner-root="true"]');
      newMap.addControl(new mapboxgl.FullscreenControl({
        container: tripPlannerRoot || undefined
      }), 'top-right');
      
      // Add Mapbox Directions control for draggable routes
      if (!directionsRef.current) {
        directionsRef.current = new MapboxDirections({
          accessToken: mapboxgl.accessToken,
          unit: 'metric',
          profile: 'mapbox/driving',
          interactive: true,  // Enable route dragging
          controls: {
            inputs: false,  // Hide inputs since we use custom UI
            instructions: false,
            profileSwitcher: false
          },
          flyTo: false,
          alternatives: true,
          congestion: true,
          geometries: 'geojson',
          // CRITICAL: Hide Directions control's default markers to prevent conflicts
          markers: {
            start: false,
            end: false,
            waypoint: false
          },
          // Disable automatic geocoding that might create location markers
          geocoder: false,
          // Disable location tracking in Directions control
          trackUserLocation: false
        });
        
        newMap.addControl(directionsRef.current, 'top-left');
        
        console.log('🗺️ Mapbox Directions control configured with hidden markers to prevent conflicts');
        
        // Sync with our waypoint system when route changes
        directionsRef.current.on('route', (event) => {
          if (event.route && event.route.length > 0) {
            const route = event.route[0];
            console.log('🛣️ Route updated via drag:', route);
            setHasDirectionsRoute(true);
            // Update internal route state with the modified route
            if (typeof waypointManager.updateRouteFromDrag === 'function') {
              waypointManager.updateRouteFromDrag(route);
            }
          }
        });
        
        // Listen for route clear events
        directionsRef.current.on('clear', () => {
          console.log('🧹 Directions route cleared');
          setHasDirectionsRoute(false);
        });
        // Debug: Confirm markers are hidden
        console.log('🔍 Directions control marker settings:', {
          startMarker: false,
          endMarker: false, 
          waypointMarker: false,
          geocoder: false,
          trackUserLocation: false
        });
      }
      
      // Create track management control (but don't add to map - controlled by toolbar)
      const trackControl = new FreshTrackControl({
        waypoints: [],
        routeProfile: 'driving',
        rvServices: {},
        onRemoveWaypoint: (id: string) => {
          // This will be updated with waypointManager reference
        },
        onSetRouteProfile: (profile: 'driving' | 'walking' | 'cycling') => {
          // This will be updated with waypointManager reference
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
      
      // Map event handlers
      newMap.on('load', () => {
        console.log('🗺️ Map loaded, attaching click handler');
        
        // Enable map clicking to add waypoints
        newMap.on('click', (e) => {
          console.log('🖱️ Map click detected, isAddingWaypoint ref:', isAddingWaypointRef.current);
          if (isAddingWaypointRef.current) {
            console.log('✅ Processing map click for waypoint');
            handleMapClick(e);
          } else {
            console.log('❌ Ignoring map click, not in waypoint mode');
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
      if (directionsRef.current && mapRef.current) {
        mapRef.current.removeControl(directionsRef.current);
        directionsRef.current = null;
      }
      if (geolocateControlRef.current && mapRef.current) {
        mapRef.current.removeControl(geolocateControlRef.current);
        geolocateControlRef.current = null;
      }
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
    if (trackControlRef.current && waypointManager) {
      trackControlRef.current.updateOptions({
        waypoints: waypointManager.waypoints,
        routeProfile: waypointManager.routeProfile,
        rvServices,
        onRemoveWaypoint: waypointManager.removeWaypoint,
        onSetRouteProfile: waypointManager.setRouteProfile,
        onRVServiceToggle: (service: string, enabled: boolean) => {
          setRvServices(prev => ({ ...prev, [service]: enabled }));
        }
      });
    }
  }, [waypointManager.waypoints, waypointManager.routeProfile, rvServices]);
  
  // Sync waypoints with Directions control
  useEffect(() => {
    if (directionsRef.current && waypointManager.waypoints.length >= 2) {
      const origin = waypointManager.waypoints[0];
      const destination = waypointManager.waypoints[waypointManager.waypoints.length - 1];
      
      // Set origin and destination on the directions control
      directionsRef.current.setOrigin([origin.coordinates[0], origin.coordinates[1]]);
      directionsRef.current.setDestination([destination.coordinates[0], destination.coordinates[1]]);
      
      console.log('🇺️ Synced waypoints with Directions control:', { origin: origin.name, destination: destination.name });
    } else if (directionsRef.current && waypointManager.waypoints.length === 0) {
      // Clear directions when waypoints are cleared
      directionsRef.current.removeRoutes();
    }
  }, [waypointManager.waypoints]);
  
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
    console.log('🎯 Map clicked! isAddingWaypoint ref:', isAddingWaypointRef.current, 'state:', isAddingWaypoint);
    
    // Prevent adding more than 2 waypoints (A and B only)
    if (waypointManager.waypoints.length >= 2) {
      console.log('Already have start (A) and end (B) points');
      toast.info('You already have start (A) and end (B) points. Clear the route to start over.');
      setIsAddingWaypoint(false);
      return;
    }
    
    // Prevent default map behavior
    e.preventDefault();
    
    const { lng, lat } = e.lngLat;
    
    try {
      // Show loading state
      toast.loading('Adding waypoint...');
      
      // Reverse geocode to get address
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();
      
      const placeName = data.features?.[0]?.place_name || `Point ${waypointManager.waypoints.length === 0 ? 'A' : 'B'}`;
      const address = data.features?.[0]?.properties?.address || '';
      
      // Add waypoint with proper A/B types
      waypointManager.addWaypoint({
        name: placeName,
        coordinates: [lng, lat],
        address,
        type: waypointManager.waypoints.length === 0 ? 'origin' : 'destination'
      });
      
      toast.dismiss(); // Remove loading toast
      const pointLabel = waypointManager.waypoints.length === 0 ? 'Point A (Start)' : 'Point B (End)';
      toast.success(`${pointLabel} added: ${placeName}`);
      
      // If we now have 2 waypoints, calculate the route and turn off adding mode
      if (waypointManager.waypoints.length === 1) {
        // Calculate route after adding the second point
        setTimeout(() => {
          if (typeof waypointManager.calculateRoute === 'function') {
            waypointManager.calculateRoute();
          }
        }, 500);
      }
      
      setIsAddingWaypoint(false);
    } catch (error) {
      console.error('Error adding waypoint:', error);
      toast.dismiss();
      toast.error('Failed to add waypoint');
      // Don't turn off adding mode if there was an error, let user try again
    }
  };
  
  // Save trip handler
  const handleSaveTrip = async () => {
    if (waypointManager.waypoints.length < 2 && !hasDirectionsRoute) {
      toast.error('Please add at least 2 waypoints or create a route');
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
    if (waypointManager.waypoints.length < 2 && !hasDirectionsRoute) {
      toast.error('Add at least 2 waypoints or create a route to export');
      return;
    }
    setShowExportHub(true);
  };
  
  const handleShareTrip = () => {
    if (waypointManager.waypoints.length < 2 && !hasDirectionsRoute) {
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
    if (waypointManager.waypoints.length < 2 && !hasDirectionsRoute) {
      toast.error('Please create a route first');
      return;
    }
    
    setIsNavigating(!isNavigating);
    toast.info(isNavigating ? 'Navigation stopped' : 'Navigation started');
  };
  
  // Clear route handler
  const handleClearRoute = () => {
    waypointManager.clearWaypoints();
    // Also clear the Directions control route if it exists
    if (directionsRef.current) {
      directionsRef.current.removeRoutes();
    }
    setHasDirectionsRoute(false);
    toast.info('Route cleared');
  };
  
  // Search location handler
  const handleSearchLocation = () => {
    setShowSearch(true);
  };

  // Route analysis handlers
  const handleShowRouteComparison = () => {
    if (waypointManager.waypoints.length < 2) {
      toast.error('Please create a route first');
      return;
    }
    setShowRouteComparison(true);
  };

  const handleShowElevationProfile = () => {
    if (!waypointManager.currentRoute?.elevation) {
      toast.error('No elevation data available for this route');
      return;
    }
    setShowElevationProfile(true);
  };

  const handleShowWaypointsManager = () => {
    if (waypointManager.waypoints.length === 0) {
      toast.error('Please add waypoints to your route first');
      return;
    }
    setShowWaypointsManager(true);
  };

  // Add waypoint button handler
  const handleAddWaypointToggle = () => {
    const newState = !isAddingWaypoint;
    console.log('🖱️ Add waypoint button clicked. Changing state from', isAddingWaypoint, 'to', newState);
    
    setIsAddingWaypoint(newState);
    
    // Immediately update the ref to ensure synchronization
    isAddingWaypointRef.current = newState;
    
    if (newState) {
      toast.info('Click on the map to add a waypoint', { duration: 3000 });
    } else {
      toast.info('Waypoint adding mode disabled');
    }
  };
  
  // Handle location selection from search
  const handleLocationSelect = (coordinates: [number, number], name: string) => {
    // Add waypoint at the selected location
    waypointManager.addWaypoint({
      coordinates,
      name,
      type: waypointManager.waypoints.length === 0 ? 'origin' : 
            waypointManager.waypoints.length === 1 ? 'destination' : 'waypoint'
    });
    
    toast.success(`Added ${name} to route`);
    setShowSearch(false);
  };
  
  // Handle template application
  const handleApplyTemplate = (template: any) => {
    // Clear existing waypoints
    waypointManager.clearWaypoints();
    
    // Add template waypoints
    template.waypoints.forEach((wp: any) => {
      waypointManager.addWaypoint({
        coordinates: wp.coordinates,
        name: wp.name,
        type: wp.type
      });
    });
    
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
        if (map && waypointManager) {
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
              waypoints
            });
          }
        }
      } catch (error) {
        console.error('Error loading template from sessionStorage:', error);
        toast.error('Failed to load template');
      }
    }
    
    // Also check for initialTemplate prop
    if (initialTemplate && map && waypointManager) {
      handleApplyTemplate(initialTemplate);
    }
  }, [map, waypointManager, initialTemplate]);
  
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
        hasRoute={waypointManager.waypoints.length >= 2 || hasDirectionsRoute}
      />
      
      {/* Add waypoint indicator */}
      {isAddingWaypoint && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Click on the map to add a waypoint
        </div>
      )}
      
      {/* Route Analysis FABs */}
      {waypointManager.waypoints.length >= 2 && (
        <div className="absolute top-32 right-4 z-[10000] flex flex-col gap-2">
          <button
            onClick={handleShowRouteComparison}
            className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            title="Compare Routes"
          >
            📊
          </button>
          {waypointManager.currentRoute?.elevation && (
            <button
              onClick={handleShowElevationProfile}
              className="bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition-colors"
              title="Elevation Profile"
            >
              ⛰️
            </button>
          )}
          <button
            onClick={handleShowWaypointsManager}
            className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
            title="Manage Waypoints"
          >
            🗂️
          </button>
          {/* Debug button (only in development) */}
          {import.meta.env.DEV && (
            <button
              onClick={() => waypointManager.debugMarkers?.()}
              className="bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors"
              title="Debug Markers & Routes"
            >
              🐛
            </button>
          )}
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
        route={waypointManager.currentRoute}
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
            waypoints={waypointManager.waypoints.map((wp, index) => ({
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
        currentRoute={waypointManager.waypoints.length >= 2 ? {
          origin: {
            name: waypointManager.waypoints[0]?.name || 'Start',
            lat: waypointManager.waypoints[0]?.coordinates[1],
            lng: waypointManager.waypoints[0]?.coordinates[0]
          },
          destination: {
            name: waypointManager.waypoints[waypointManager.waypoints.length - 1]?.name || 'End',
            lat: waypointManager.waypoints[waypointManager.waypoints.length - 1]?.coordinates[1],
            lng: waypointManager.waypoints[waypointManager.waypoints.length - 1]?.coordinates[0]
          },
          waypoints: waypointManager.waypoints.slice(1, -1).map(wp => ({
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
          waypoints: waypointManager.waypoints,
          route: waypointManager.currentRoute,
          profile: waypointManager.routeProfile,
          distance: waypointManager.currentRoute?.distance,
          duration: waypointManager.currentRoute?.duration
        }}
        onSaveSuccess={(savedTrip) => {
          console.log('Trip saved:', savedTrip);
          if (onSaveTrip) {
            onSaveTrip(savedTrip);
          }
        }}
      />
      
      {/* Route Comparison Dialog */}
      <FreshRouteComparison
        isOpen={showRouteComparison}
        onClose={() => setShowRouteComparison(false)}
        route={waypointManager.currentRoute}
        onRouteSelect={(routeIndex) => {
          console.log('Route selected:', routeIndex);
          // TODO: Implement route switching
        }}
      />
      
      {/* Elevation Profile Dialog */}
      <FreshElevationProfile
        isOpen={showElevationProfile}
        onClose={() => setShowElevationProfile(false)}
        elevation={waypointManager.currentRoute?.elevation || null}
        vehicleType={userProfile?.vehicle_info?.enhanced_type || 'Standard Vehicle'}
      />
      
      {/* Waypoints Manager Dialog */}
      <FreshDraggableWaypoints
        isOpen={showWaypointsManager}
        onClose={() => setShowWaypointsManager(false)}
        waypoints={waypointManager.waypoints}
        onRemoveWaypoint={(id: string) => {
          waypointManager.removeWaypoint(id);
          toast.info('Waypoint removed');
        }}
        onReorderWaypoints={(startIndex: number, endIndex: number) => {
          waypointManager.reorderWaypoints(startIndex, endIndex);
          toast.info('Waypoints reordered');
        }}
        onNavigateToWaypoint={(waypoint) => {
          if (map) {
            map.flyTo({
              center: waypoint.coordinates,
              zoom: 15,
              duration: 2000
            });
          }
        }}
      />
    </div>
  );
};

export default FreshTripPlanner;