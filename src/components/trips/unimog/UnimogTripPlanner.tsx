import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Map, List, MapPin, Layers, Save, Car, Footprints, Bike, Trash2, Navigation, Share2, Crosshair, Upload, Download, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useWaypointManager } from '@/hooks/useWaypointManager';
import { toast } from 'sonner';
import mapboxgl from 'mapbox-gl';
import { formatDistance, formatDuration, DirectionsRoute } from '@/services/mapboxDirections';
import { Waypoint } from '@/types/waypoint';
import MapOverlaysDropdown from './MapOverlaysDropdown';
import GPXModal from './GPXModal';
import TripSidebar from './TripSidebar';
import TripToolbar from './TripToolbar';
import SaveRouteModal from './modals/SaveRouteModal';
import POIModal from './modals/POIModal';
import SettingsModal from './modals/SettingsModal';
import PamTripAssistant from './PamTripAssistant';
import TripBudgetCalculator from './TripBudgetCalculator';

// Map styles configuration
const MAP_STYLES = {
  STREETS: 'mapbox://styles/mapbox/streets-v12',
  OUTDOORS: 'mapbox://styles/mapbox/outdoors-v12',
  SATELLITE: 'mapbox://styles/mapbox/satellite-v9',
  SATELLITE_STREETS: 'mapbox://styles/mapbox/satellite-streets-v12',
};

interface UnimogTripPlannerProps {
  onSaveTrip?: (tripData: any) => void;
  onBack?: () => void;
  savedTrips?: any[];
  isLoading?: boolean;
}

const UnimogTripPlanner: React.FC<UnimogTripPlannerProps> = ({
  onSaveTrip,
  onBack,
  savedTrips = [],
  isLoading = false
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentMapStyle, setCurrentMapStyle] = useState<string>(MAP_STYLES.OUTDOORS);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showGPXModal, setShowGPXModal] = useState(false);
  const [gpxModalMode, setGPXModalMode] = useState<'import' | 'export'>('import');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);
  const [history, setHistory] = useState<Waypoint[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showPOIModal, setShowPOIModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedPOICoords, setSelectedPOICoords] = useState<[number, number] | undefined>();
  const [tripSettings, setTripSettings] = useState<any>(null);
  const [showPamAssistant, setShowPamAssistant] = useState(false);
  const [showBudgetCalculator, setShowBudgetCalculator] = useState(false);
  const [tripBudget, setTripBudget] = useState<any>(null);
  
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { location } = useGeolocation();
  
  // Track map loaded state for waypoint manager
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  
  // Use the waypoint manager for all waypoint operations
  const waypointManager = useWaypointManager({ 
    map: mapInstance,
    onRouteUpdate: (waypoints) => {
      console.log('Route updated with waypoints:', waypoints.length);
    }
  });
  
  const {
    waypoints,
    currentRoute, 
    routeProfile,
    isLoadingRoute,
    isAddingMode: isAddingWaypoints,
    setIsAddingMode: setIsAddingWaypoints,
    setRouteProfile,
    addWaypointAtLocation,
    clearMarkers
  } = waypointManager;

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Check WebGL support first
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!(gl && gl instanceof WebGLRenderingContext);
      } catch (error) {
        console.warn('WebGL detection failed:', error);
        return false;
      }
    };

    if (!checkWebGLSupport()) {
      console.error('WebGL is not supported on this device/browser');
      toast({
        title: "Map Unavailable", 
        description: "Your browser doesn't support WebGL, which is required for maps. Please try a modern browser.",
        variant: "destructive"
      });
      return;
    }

    // Try multiple token sources for flexibility
    const token = import.meta.env.VITE_MAPBOX_TOKEN || 
                  import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    
    if (!token || token.includes('your_mapbox_token') || token.includes('your_actual')) {
      console.error('Valid Mapbox token not found. Token:', token?.substring(0, 20) + '...');
      toast({
        title: "Map Configuration Error",
        description: "Mapbox token is not properly configured. Please check environment variables.",
        variant: "destructive"
      });
      return;
    }

    console.log('🗺️ Initializing Mapbox with token:', token.substring(0, 20) + '...');
    mapboxgl.accessToken = token;

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: currentMapStyle,
        center: location ? [location.longitude, location.latitude] : [-98.5795, 39.8283], // Default to center of US
        zoom: location ? 12 : 4,
        // Add WebGL-specific options for better compatibility
        preserveDrawingBuffer: true,
        antialias: true
      });

      // Add navigation controls
      map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      
      // Add geolocate control
      const geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      });
      map.addControl(geolocateControl, 'bottom-right');

      map.on('load', () => {
        console.log('✅ Unimog trip planner map loaded successfully');
        setMapLoaded(true);
        setMapInstance(map);
        
        // Auto-center on user location if available
        if (location) {
          map.flyTo({
            center: [location.longitude, location.latitude],
            zoom: 12,
            duration: 2000
          });
        }
      });

      map.on('error', (error) => {
        console.error('❌ Map error occurred:', error);
        toast({
          title: "Map Error",
          description: "Map encountered an error. Please refresh the page to try again.",
          variant: "destructive"
        });
      });

      mapRef.current = map;
      console.log('✅ Map instance created and stored');

    } catch (error) {
      console.error('❌ Failed to create Mapbox map:', error);
      toast({
        title: "Map Initialization Failed",
        description: `Failed to initialize map: ${error.message}. Please check your internet connection and try again.`,
        variant: "destructive"
      });
      return;
    }

    return () => {
      if (mapRef.current) {
        console.log('🧹 Cleaning up map instance');
        mapRef.current.remove();
        mapRef.current = null;
        setMapInstance(null);
        setMapLoaded(false);
      }
    };
  }, []);

  // Undo/Redo functionality
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousWaypoints = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setWaypoints(previousWaypoints);
      toast.info('Undone');
    }
  }, [history, historyIndex, setWaypoints]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextWaypoints = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setWaypoints(nextWaypoints);
      toast.info('Redone');
    }
  }, [history, historyIndex, setWaypoints]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Add waypoints to history when they change
  useEffect(() => {
    if (waypoints.length > 0 || history.length > 0) {
      // Only add to history if waypoints actually changed
      const currentWaypoints = historyIndex >= 0 ? history[historyIndex] : [];
      if (JSON.stringify(waypoints) !== JSON.stringify(currentWaypoints)) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push([...waypoints]);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }
  }, [waypoints]);

  // Update map style
  const handleStyleChange = useCallback((style: string) => {
    console.log('Changing map style to:', style);
    setCurrentMapStyle(style);
    if (mapRef.current) {
      mapRef.current.setStyle(style);
    }
  }, []);

  // Toggle waypoint adding mode
  const toggleWaypointMode = () => {
    setIsAddingWaypoints(!isAddingWaypoints);
    if (!isAddingWaypoints) {
      toast.info('Click on the map to add waypoints');
    }
  };

  // Clear all waypoints
  const clearWaypoints = () => {
    clearMarkers();
  };

  // Manual center on user location
  const centerOnUserLocation = useCallback(() => {
    if (mapRef.current && location) {
      console.log('Manual centering on user location:', location);
      mapRef.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 12,
        duration: 1500
      });
      toast.info('Centered on your location');
    } else {
      toast.error('Location not available');
    }
  }, [location]);

  // Save route handler
  const handleSaveRoute = async () => {
    if (!user) {
      toast.error('Please sign in to save routes');
      return;
    }
    
    if (waypoints.length < 2) {
      toast.error('Need at least 2 waypoints to save a route');
      return;
    }
    
    // Create trip data from current route
    const tripData = {
      waypoints,
      route: currentRoute,
      routeProfile,
      mapStyle: currentMapStyle,
      distance: currentRoute?.distance || 0,
      duration: currentRoute?.duration || 0
    };
    
    if (onSaveTrip) {
      onSaveTrip(tripData);
    }
    
    toast.success('Trip saved successfully!');
    clearWaypoints();
  };

  // Share route handler
  const handleShareRoute = () => {
    if (!user) {
      toast.error('Please sign in to share routes');
      return;
    }
    
    if (waypoints.length < 2) {
      toast.error('Need at least 2 waypoints to share a route');
      return;
    }
    
    // Create shareable route info
    const routeInfo = `RV Route with ${waypoints.length} waypoints${currentRoute ? `, ${formatDistance(currentRoute.distance)} long` : ''}`;
    navigator.clipboard.writeText(routeInfo);
    toast.success('Route details copied to clipboard!');
  };

  // Toggle list view
  const toggleView = () => {
    setShowList(!showList);
  };

  // Handle GPX import
  const handleGPXImport = (gpxData: any) => {
    if (gpxData && gpxData.points) {
      // Convert GPX points to waypoints
      const newWaypoints = gpxData.points.slice(0, 25).map((point: any, index: number) => ({
        id: `waypoint-${Date.now()}-${index}`,
        coords: [point.lon, point.lat] as [number, number],
        name: `Point ${index + 1}`,
        type: index === 0 ? 'origin' : index === gpxData.points.length - 1 ? 'destination' : 'waypoint',
        order: index,
        elevation: point.ele
      }));
      
      // Load waypoints using the waypoint manager
      waypointManager.setWaypoints(newWaypoints);
      toast.success(`Loaded ${newWaypoints.length} waypoints from GPX`);
      
      // Center map on the route
      if (mapRef.current && gpxData.bounds) {
        mapRef.current.fitBounds([
          [gpxData.bounds.minLon, gpxData.bounds.minLat],
          [gpxData.bounds.maxLon, gpxData.bounds.maxLat]
        ], { padding: 50 });
      }
    }
  };

  // Undo/Redo functionality (placeholder for now)
  const undo = () => {
    toast.info('Undo feature coming soon');
  };

  const redo = () => {
    toast.info('Redo feature coming soon');
  };

  // Open GPX import modal
  const openGPXImport = () => {
    setGPXModalMode('import');
    setShowGPXModal(true);
  };

  // Open GPX export modal
  const openGPXExport = () => {
    setGPXModalMode('export');
    setShowGPXModal(true);
  };

  // Handle save trip
  const handleSaveTrip = async (tripData: any) => {
    try {
      // Integration with Wheels & Wins save functionality
      if (onSaveTrip) {
        await onSaveTrip({
          ...tripData,
          waypoints,
          route: currentRoute
        });
      }
      toast.success('Trip saved successfully!');
      setShowSaveModal(false);
    } catch (error) {
      toast.error('Failed to save trip');
      console.error('Error saving trip:', error);
    }
  };

  // Handle add POI
  const handleAddPOI = async (poiData: any) => {
    try {
      // Add POI marker to map
      if (mapRef.current && poiData.coordinates) {
        const marker = new mapboxgl.Marker({
          color: '#FF6B6B'
        })
          .setLngLat(poiData.coordinates)
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div class="p-2">
              <h3 class="font-semibold">${poiData.name}</h3>
              <p class="text-sm">${poiData.description || ''}</p>
            </div>
          `))
          .addTo(mapRef.current);
      }
      
      toast.success('POI added to map');
      setShowPOIModal(false);
      setSelectedPOICoords(undefined);
    } catch (error) {
      toast.error('Failed to add POI');
      console.error('Error adding POI:', error);
    }
  };

  // Handle save settings
  const handleSaveSettings = async (settings: any) => {
    try {
      setTripSettings(settings);
      // Apply settings to map and routing
      toast.success('Settings saved');
      setShowSettingsModal(false);
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
    }
  };

  return (
    <div className="h-full w-full relative">
      {/* Map container */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Control Panel */}
      <div className="absolute top-4 left-4 z-50">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 space-y-4 w-64">
          {/* Map Overlays Dropdown */}
          <div className="flex justify-between items-center">
            <MapOverlaysDropdown 
              map={mapInstance}
              currentMapStyle={currentMapStyle}
              onStyleChange={handleStyleChange}
            />
          </div>

          {/* Waypoint Controls */}
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2 flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Route Planning
            </div>
            
            {/* Route Profile Selection */}
            {waypoints.length > 0 && (
              <div className="grid grid-cols-3 gap-1 mb-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={routeProfile === 'driving' ? "default" : "outline"}
                      className="text-xs px-2"
                      onClick={() => setRouteProfile('driving')}
                    >
                      <Car className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Driving route</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={routeProfile === 'walking' ? "default" : "outline"}
                      className="text-xs px-2"
                      onClick={() => setRouteProfile('walking')}
                    >
                      <Footprints className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Walking route</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={routeProfile === 'cycling' ? "default" : "outline"}
                      className="text-xs px-2"
                      onClick={() => setRouteProfile('cycling')}
                    >
                      <Bike className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cycling route</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            
            <div className="space-y-2">
              <Button
                size="sm"
                variant={isAddingWaypoints ? "default" : "outline"}
                className="w-full text-xs"
                onClick={toggleWaypointMode}
              >
                <MapPin className="h-3 w-3 mr-1" />
                {isAddingWaypoints ? 'Stop Adding' : 'Add Waypoints'}
              </Button>
              
              {waypoints.length > 0 && (
                <>
                  <div className="text-xs text-muted-foreground">
                    {waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''} added
                  </div>
                  
                  {currentRoute && (
                    <div className="bg-blue-50 rounded p-2 text-xs space-y-1">
                      <div>Distance: {formatDistance(currentRoute.distance)}</div>
                      <div>Duration: {formatDuration(currentRoute.duration)}</div>
                    </div>
                  )}
                  
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={clearWaypoints}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear all waypoints</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {waypoints.length >= 2 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={handleShareRoute}
                            disabled={isLoadingRoute || !user}
                          >
                            <Share2 className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{!user ? "Sign in to share" : "Share this route"}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  
                  {/* Save trip button */}
                  {waypoints.length >= 2 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full text-xs bg-primary hover:bg-primary/90"
                          onClick={handleSaveRoute}
                          disabled={isLoadingRoute || !user}
                        >
                          <Save className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Save Trip</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{!user ? "Sign in to save trips" : "Save this trip"}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
              
              {/* Center on Location Button */}
              <div className="pt-2 border-t">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={centerOnUserLocation}
                      disabled={!location}
                    >
                      <Crosshair className="h-3 w-3 mr-1" />
                      Center on Me
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Center map on your location</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* GPX Import/Export Buttons */}
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={openGPXImport}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Import
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Import GPX/KML file</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={openGPXExport}
                      disabled={waypoints.length === 0}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export route as GPX</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      {onBack && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm hover:bg-white border shadow-md"
            onClick={onBack}
          >
            Back to Wheels
          </Button>
        </div>
      )}

      {/* Toggle View Button */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm hover:bg-white border shadow-md"
          onClick={toggleView}
        >
          {showList ? <Map className="h-4 w-4" /> : <List className="h-4 w-4" />}
          <span className="ml-2">{showList ? 'Map' : 'Saved Trips'}</span>
        </Button>
      </div>

      {/* Saved Trips Sidebar */}
      {showList && (
        <div className="absolute top-16 right-4 bottom-4 w-80 z-40">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg h-full flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Saved Trips</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="text-center text-muted-foreground">Loading trips...</div>
              ) : savedTrips.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No saved trips yet. Create your first route!
                </div>
              ) : (
                <div className="space-y-2">
                  {savedTrips.map((trip, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        // Load trip data
                        console.log('Loading trip:', trip);
                        setShowList(false);
                      }}
                    >
                      <div className="font-medium text-sm">{trip.name || `Trip ${index + 1}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {trip.waypoints?.length} waypoints
                        {trip.distance && ` • ${formatDistance(trip.distance)}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoadingRoute && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Calculating route...</span>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSidebar(!showSidebar)}
        className="absolute top-4 left-4 z-30 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Trip Sidebar */}
      <TripSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onCreateTrip={() => {
          clearWaypoints();
          toast.info('Click on the map to add waypoints');
          setIsAddingWaypoints(true);
        }}
        onSelectTemplate={(template) => {
          toast.info(`Loading template: ${template.name}`);
          // TODO: Load template waypoints
        }}
        onSearchLocation={(query) => {
          // TODO: Implement geocoding search
          toast.info(`Searching for: ${query}`);
        }}
      />

      {/* Bottom Toolbar */}
      <TripToolbar
        onUndo={undo}
        onRedo={redo}
        onSave={() => setShowSaveModal(true)}
        onExport={openGPXExport}
        onImport={openGPXImport}
        onShare={() => toast.info('Share feature coming soon')}
        onPrint={() => toast.info('Print feature coming soon')}
        onSettings={() => setShowSettingsModal(true)}
        onStartNavigation={() => {
          setIsNavigating(!isNavigating);
          toast.info(isNavigating ? 'Navigation stopped' : 'Navigation started');
        }}
        onAddWaypoint={toggleWaypointMode}
        onOptimizeRoute={() => optimizeRoute()}
        onClearRoute={clearWaypoints}
        onToggleTraffic={() => setShowTraffic(!showTraffic)}
        canUndo={canUndo}
        canRedo={canRedo}
        hasRoute={waypoints.length >= 2}
        isNavigating={isNavigating}
        showTraffic={showTraffic}
        onBudgetCalculator={() => setShowBudgetCalculator(!showBudgetCalculator)}
        onOpenPAM={() => setShowPamAssistant(!showPamAssistant)}
      />

      {/* GPX Import/Export Modal */}
      <GPXModal
        isOpen={showGPXModal}
        onClose={() => setShowGPXModal(false)}
        mode={gpxModalMode}
        onImport={handleGPXImport}
        currentRoute={currentRoute}
        waypoints={waypoints}
      />

      {/* Save Route Modal */}
      <SaveRouteModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveTrip}
        waypoints={waypoints}
        routeInfo={currentRoute ? {
          distance: currentRoute.distance / 1000, // Convert to km
          duration: currentRoute.duration
        } : undefined}
      />

      {/* POI Modal */}
      <POIModal
        isOpen={showPOIModal}
        onClose={() => {
          setShowPOIModal(false);
          setSelectedPOICoords(undefined);
        }}
        onAdd={handleAddPOI}
        coordinates={selectedPOICoords}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSaveSettings}
        currentSettings={tripSettings}
      />

      {/* PAM Trip Assistant */}
      <PamTripAssistant
        isOpen={showPamAssistant}
        onClose={() => setShowPamAssistant(false)}
        tripData={{
          waypoints,
          route: currentRoute,
          budget: tripBudget?.totalBudget
        }}
        onSuggestion={(suggestion) => {
          // Handle PAM suggestions (e.g., add POIs, adjust route)
          console.log('PAM suggestion:', suggestion);
        }}
      />

      {/* Budget Calculator */}
      <TripBudgetCalculator
        isOpen={showBudgetCalculator}
        onClose={() => setShowBudgetCalculator(false)}
        routeData={currentRoute ? {
          distance: currentRoute.distance,
          duration: currentRoute.duration,
          waypoints
        } : undefined}
        onSaveBudget={(budget) => {
          setTripBudget(budget);
          toast.success('Budget saved for this trip');
        }}
      />
    </div>
  );
};

export default UnimogTripPlanner;