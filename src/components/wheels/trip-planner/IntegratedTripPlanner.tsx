import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import TripPlannerControls from "./TripPlannerControls";
import TripPlannerHeader from "./TripPlannerHeader";
import OfflineTripBanner from "./OfflineTripBanner";
import WaypointsList from "./WaypointsList";
import SuggestionsGrid from "./SuggestionsGrid";
import LockedPointControls from "./LockedPointControls";
import { useIntegratedTripState } from "./hooks/useIntegratedTripState";
import { useTripPlannerHandlers } from "./hooks/useTripPlannerHandlers";
import { PAMProvider } from "./PAMContext";
import { useToast } from "@/hooks/use-toast";

interface IntegratedTripPlannerProps {
  isOffline?: boolean;
}

export default function IntegratedTripPlanner({ isOffline = false }: IntegratedTripPlannerProps) {
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>();
  const directionsControl = useRef<MapboxDirections>();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Use integrated state management
  const integratedState = useIntegratedTripState(isOffline);
  const handlers = useTripPlannerHandlers({
    directionsControl,
    originName: integratedState.route.originName,
    destName: integratedState.route.destName,
    waypoints: integratedState.route.waypoints,
    setSuggestions: integratedState.setSuggestions,
    saveTripData: integratedState.saveTripData,
    routeProfile: integratedState.travelMode,
    mode: integratedState.mode
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      console.log(`Initializing map... ${isOffline ? 'OFFLINE MODE' : 'ONLINE MODE'}`);

      if (isOffline) {
        // Offline mode - create a simple canvas-based map
        initializeOfflineMap();
      } else {
        // Online mode - use Mapbox
        initializeOnlineMap();
      }
    } catch (error) {
      console.error('Error creating map:', error);
      setMapError('Failed to initialize map. Switching to offline mode...');
      // Fallback to offline map
      setTimeout(() => {
        initializeOfflineMap();
      }, 1000);
    }

    // Cleanup function
    return () => {
      if (map.current && typeof map.current.remove === 'function') {
        console.log('Cleaning up map...');
        map.current.remove();
        map.current = undefined;
      }
    };
  }, [isOffline]);

  const initializeOnlineMap = () => {
    try {
      // Set Mapbox access token from environment variable
      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
      
      console.log('Mapbox token from env:', mapboxToken ? 'Found' : 'Not found');
      
      if (!mapboxToken) {
        console.error('Mapbox token not found in environment variables');
        setMapError('Mapbox token missing. Switching to offline mode...');
        setTimeout(() => initializeOfflineMap(), 1000);
        return;
      }

      mapboxgl.accessToken = mapboxToken;

      console.log('Creating Mapbox map...');

      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-98.5795, 39.8283], // Center of US
        zoom: 4,
        attributionControl: false,
      });

      // Add attribution control
      map.current.addControl(new mapboxgl.AttributionControl({ compact: true }));

      // Map load event
      map.current.on("load", () => {
        console.log('Online map loaded successfully');
        setMapLoaded(true);
        setMapError(null);
        initializeDirections();
      });

      // Map error event - fallback to offline
      map.current.on("error", (e) => {
        console.error('Online map error:', e);
        setMapError('Connection issue. Switching to offline mode...');
        setTimeout(() => {
          initializeOfflineMap();
        }, 2000);
      });

      // Style load event
      map.current.on("styledata", () => {
        console.log('Map style loaded');
      });

    } catch (error) {
      console.error('Error creating online map:', error);
      setMapError('Failed to create map. Switching to offline mode...');
      setTimeout(() => initializeOfflineMap(), 1000);
    }
  };

  const initializeOfflineMap = () => {
    try {
      console.log('Initializing offline map...');
      
      if (mapContainer.current) {
        // Clear container
        mapContainer.current.innerHTML = '';
        
        // Create offline map interface
        const offlineMapDiv = document.createElement('div');
        offlineMapDiv.className = 'offline-map';
        offlineMapDiv.style.cssText = `
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          border-radius: 8px;
          overflow: hidden;
        `;

        // Add offline map header
        const header = document.createElement('div');
        header.style.cssText = `
          background: rgba(25, 118, 210, 0.1);
          padding: 12px 16px;
          border-bottom: 1px solid rgba(25, 118, 210, 0.2);
          font-size: 14px;
          font-weight: 500;
          color: #1976d2;
        `;
        header.innerHTML = '📍 Offline Trip Planner';

        // Add route planning area
        const routeArea = document.createElement('div');
        routeArea.style.cssText = `
          flex: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        `;

        routeArea.innerHTML = `
          <div style="max-width: 400px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🗺️</div>
            <h3 style="margin: 0 0 12px 0; color: #1976d2; font-size: 18px;">Plan Your Route</h3>
            <p style="margin: 0 0 20px 0; color: #666; font-size: 14px; line-height: 1.5;">
              Use the route controls above to set your origin and destination. 
              Your route will be calculated and displayed here when online.
            </p>
            <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="font-size: 12px; color: #888; margin-bottom: 8px;">CURRENT ROUTE</div>
              <div id="offline-route-display" style="font-size: 14px; color: #333;">
                ${integratedState.route.originName && integratedState.route.destName 
                  ? `${integratedState.route.originName} → ${integratedState.route.destName}`
                  : 'No route set'}
              </div>
              ${integratedState.route.waypoints.length > 0 
                ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${integratedState.route.waypoints.length} waypoints planned</div>`
                : ''
              }
            </div>
          </div>
        `;

        offlineMapDiv.appendChild(header);
        offlineMapDiv.appendChild(routeArea);
        mapContainer.current.appendChild(offlineMapDiv);

        setMapLoaded(true);
        setMapError(null);
        
        // Mock map object for offline mode
        map.current = {
          remove: () => {
            if (mapContainer.current) {
              mapContainer.current.innerHTML = '';
            }
          }
        } as any;
      }
    } catch (error) {
      console.error('Error creating offline map:', error);
      setMapError('Failed to initialize offline map.');
    }
  };

  const initializeDirections = () => {
    try {
      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
      
      directionsControl.current = new MapboxDirections({
        accessToken: mapboxToken,
        unit: "imperial",
        profile: "mapbox/driving",
        interactive: true,
        controls: { 
          instructions: false, 
          profileSwitcher: false 
        },
      });

      if (map.current && directionsControl.current && typeof map.current.addControl === 'function') {
        map.current.addControl(directionsControl.current, "top-left");
        
        // Set up event listeners
        directionsControl.current.on("route", (e) => {
          console.log('Route changed:', e);
          if (handlers.handleRouteChange) {
            handlers.handleRouteChange(e);
          }
        });
        
        directionsControl.current.on("clear", () => {
          console.log('Route cleared');
        });
        
        map.current.on("click", (e) => {
          console.log('Map clicked:', e.lngLat);
        });
      }
    } catch (directionsError) {
      console.error('Error initializing directions:', directionsError);
    }
  };

  // Enhanced submit handler with PAM integration
  const handleSubmitTrip = async () => {
    try {
      if (integratedState.route.originName && integratedState.route.destName) {
        const budget = integratedState.budget?.totalBudget || 0;
        const message = `Optimize my trip from ${integratedState.route.originName} to ${integratedState.route.destName}. Budget: ${budget}. Consider social meetups and scenic routes.`;
        await integratedState.sendPAMRequest(message);
        
        toast({
          title: "Trip Optimization Started",
          description: "PAM is analyzing your route for the best recommendations.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send trip to PAM. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <PAMProvider>
      <div className="space-y-6">
        {/* Header */}
        <TripPlannerHeader isOffline={isOffline} />

        {/* Offline Banner */}
        {isOffline && <OfflineTripBanner />}

        {/* Trip Controls */}
        <TripPlannerControls
          directionsControl={directionsControl}
          originName={integratedState.route.originName}
          destName={integratedState.route.destName}
          setOriginName={integratedState.setOriginName}
          setDestName={integratedState.setDestName}
          travelMode={integratedState.travelMode}
          setTravelMode={integratedState.setTravelMode}
          mode={integratedState.mode}
          setMode={integratedState.setMode}
          adding={integratedState.adding}
          setAdding={integratedState.setAdding}
          onSubmitTrip={handleSubmitTrip}
          map={map}
          isOffline={isOffline}
          originLocked={integratedState.originLocked}
          destinationLocked={integratedState.destinationLocked}
          lockOrigin={integratedState.lockOrigin}
          lockDestination={integratedState.lockDestination}
        />

        {/* Locked Point Controls */}
        {(integratedState.originLocked || integratedState.destinationLocked) && (
          <LockedPointControls
            originLocked={integratedState.originLocked}
            destinationLocked={integratedState.destinationLocked}
            originName={integratedState.route.originName}
            destName={integratedState.route.destName}
            onUnlockOrigin={integratedState.unlockOrigin}
            onUnlockDestination={integratedState.unlockDestination}
          />
        )}

        {/* Map Container */}
        <div className="relative">
          <div
            ref={mapContainer}
            className="h-[50vh] sm:h-[60vh] lg:h-[70vh] min-h-[400px] w-full rounded-lg border shadow-sm bg-gray-100"
            style={{ 
              position: 'relative',
              overflow: 'hidden'
            }}
          />
          
          {/* Map Loading State */}
          {!mapLoaded && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}

          {/* Map Error State */}
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="text-center p-4">
                <p className="text-sm text-red-600 mb-2">{mapError}</p>
                <button 
                  onClick={() => {
                    setMapError(null);
                    setMapLoaded(false);
                    if (map.current && typeof map.current.remove === 'function') {
                      map.current.remove();
                      map.current = undefined;
                    }
                    // Retry initialization
                    setTimeout(() => {
                      if (isOffline) {
                        initializeOfflineMap();
                      } else {
                        initializeOnlineMap();
                      }
                    }, 500);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Map Status Indicator */}
          {mapLoaded && !mapError && (
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs">
              {isOffline ? (
                <span className="text-orange-600">📍 Offline Mode</span>
              ) : (
                <span className="text-green-600">✓ Online Map</span>
              )}
            </div>
          )}
        </div>

        {/* Waypoints List */}
        {integratedState.route.waypoints.length > 0 && (
          <WaypointsList
            waypoints={integratedState.route.waypoints}
            setWaypoints={() => {}}
            directionsControl={directionsControl}
          />
        )}

        {/* Suggestions Grid */}
        {integratedState.route.suggestions.length > 0 && (
          <SuggestionsGrid
            suggestions={integratedState.route.suggestions}
          />
        )}
      </div>
    </PAMProvider>
  );
}