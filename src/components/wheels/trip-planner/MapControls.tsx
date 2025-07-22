import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
// Mapbox CSS imported globally in index.css
// Simple direct token access like the working version
import { regionCenters } from "./constants";
import { reverseGeocode } from "./utils";
import { Waypoint } from "./types";
import { useUserUnits } from "./hooks/useUserUnits";
import { MapOptionsControl } from "./MapOptionsControl";
import { SimpleMapOptionsControl } from "./SimpleMapOptionsControl";
import POILayer from "./POILayer";
import { toast } from "@/hooks/use-toast";
import { useLocationTracking } from "@/hooks/useLocationTracking";

interface ManualWaypoint {
  id: string;
  latitude: number;
  longitude: number;
  order: number;
  isLocked: boolean;
}

interface MapControlsProps {
  region: string;
  waypoints: Waypoint[];
  setWaypoints: (waypoints: Waypoint[]) => void;
  adding: boolean;
  setAdding: (adding: boolean) => void;
  setOriginName: (name: string) => void;
  setDestName: (name: string) => void;
  onRouteChange: () => void;
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
  originName: string;
  destName: string;
  travelMode: string;
  onTravelModeChange: (mode: string) => void;
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  isOffline?: boolean;
  exclude: string[];
  annotations: string[];
  vehicle: string;
  originLocked: boolean;
  destinationLocked: boolean;
  lockOrigin: () => void;
  lockDestination: () => void;
  routeType: string;
  manualMode: boolean;
  manualWaypoints: ManualWaypoint[];
  onManualWaypointAdd: (waypoint: ManualWaypoint) => void;
  onManualWaypointRemove: (id: string) => void;
}

export default function MapControls({
  region,
  waypoints,
  setWaypoints,
  adding,
  setAdding,
  setOriginName,
  setDestName,
  onRouteChange,
  directionsControl,
  originName,
  destName,
  travelMode,
  onTravelModeChange,
  map,
  isOffline = false,
  exclude,
  annotations,
  vehicle,
  originLocked,
  destinationLocked,
  lockOrigin,
  lockDestination,
  routeType,
  manualMode,
  manualWaypoints,
  onManualWaypointAdd,
  onManualWaypointRemove,
}: MapControlsProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const { units, loading: unitsLoading } = useUserUnits();
  const [currentStyle, setCurrentStyle] = useState("mapbox://styles/mapbox/streets-v11");
  const locationTracking = useLocationTracking();
  const [poiFilters, setPOIFilters] = useState<Record<string, boolean>>({
    pet_stop: true,
    wide_parking: true,
    medical: true,
    farmers_market: true
  });
  const optionsControlRef = useRef<MapOptionsControl>();
  const isProgrammaticUpdate = useRef(false);
  const manualWaypointMarkers = useRef<mapboxgl.Marker[]>([]);

  // Initialize map and directions
  useEffect(() => {
    if (!mapContainer.current || unitsLoading) return;
    
    const center = regionCenters[region] || regionCenters.US;

    if (!map.current) {
      // Simple direct token access like the working version
      const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN;
      
      console.log('🗺️ MapControls - Direct token access:', {
        publicToken: import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ? 'SET' : 'MISSING',
        legacyToken: import.meta.env.VITE_MAPBOX_TOKEN ? 'SET' : 'MISSING',
        usingToken: token ? token.substring(0, 20) + '...' : 'NONE'
      });
      
      if (!token) {
        console.error('❌ Cannot initialize map: No valid Mapbox token available');
        toast({
          title: "Map Configuration Error",
          description: "Please configure VITE_MAPBOX_TOKEN or VITE_MAPBOX_PUBLIC_TOKEN environment variable.",
          variant: "destructive",
        });
        return;
      }
      
      // Simple direct token setting
      mapboxgl.accessToken = token;
      console.log('✅ Token set successfully:', token.substring(0, 20) + '...');
      
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v11",
          center,
          zoom: 3.5,
          hash: true, // Enable URL hash for sharing map state
          projection: 'mercator'
        });
        
        console.log('✅ Map initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize map:', error);
        toast({
          title: "Map Error",
          description: "Failed to initialize map. Please check your internet connection and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Add navigation controls with compass and zoom
      map.current.addControl(new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true
      }), 'top-right');
      
      // Add geolocate control (like Roadtrippers has)
      map.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }), 'top-right');
      
      // Add fullscreen control
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      
      // Add scale control with dynamic units
      map.current.addControl(new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: units
      }), 'bottom-left');

      // Add native Map Options Control with error handling
      try {
        console.log('🗂️ MapControls: About to create SimpleMapOptionsControl');
        const optionsControl = new SimpleMapOptionsControl({
          onStyleChange: setCurrentStyle
        });
        console.log('🗂️ MapControls: SimpleMapOptionsControl created', optionsControl);
        
        // Store reference before adding to map
        optionsControlRef.current = optionsControl;
        
        console.log('🗂️ MapControls: About to add control to map');
        map.current.addControl(optionsControl, 'top-right');
        console.log('🗂️ MapControls: Control added to map successfully');
        
        // Verify control was added
        setTimeout(() => {
          const controlElements = document.querySelectorAll('.mapboxgl-ctrl-group');
          console.log('🗂️ MapControls: Control groups found:', controlElements.length);
          const buttons = document.querySelectorAll('.mapboxgl-ctrl-icon');
          console.log('🗂️ MapControls: Control buttons found:', buttons.length);
        }, 1000);
        
      } catch (error) {
        console.error('❌ MapControls: Failed to create/add options control:', error);
      }

      // Wait for map to load before creating directions control
      map.current.on('load', () => {
        if (!directionsControl.current && map.current) {
          console.log('Creating directions control after map load');
          
          // Create directions control with dynamic units based on user's region
          const dir = new MapboxDirections({
            accessToken: mapboxgl.accessToken,
            unit: units, // Dynamic units based on user's address/region
            profile: `mapbox/${travelMode === 'traffic' ? 'driving-traffic' : travelMode}`,
            interactive: !isOffline,
            controls: {
              instructions: true, // Enable turn-by-turn instructions like Roadtrippers
              inputs: true,
              profileSwitcher: true // Allow switching between driving/walking/cycling
            },
            alternatives: true, // Show alternative routes like Roadtrippers
            congestion: annotations.includes('congestion'), // Show traffic congestion if selected
            exclude: exclude.length ? exclude.join(',') : undefined,
            annotations: annotations.length ? annotations.join(',') : undefined,
            vehicle,
            flyTo: true, // Smooth camera transitions
            placeholderOrigin: 'Choose starting point',
            placeholderDestination: 'Choose destination',
            zoom: 15 // Higher zoom for detailed route viewing
          });
          
          directionsControl.current = dir;
          
          // Add the directions control to the map
          map.current.addControl(dir, 'top-left');

          // Set up event listeners for origin/destination changes
          dir.on("origin", (e) => {
            // Skip if this is a programmatic update or if origin is locked
            if (isOffline || originLocked || isProgrammaticUpdate.current) {
              console.log('🔒 Origin event blocked: offline?', isOffline, 'locked?', originLocked, 'programmatic?', isProgrammaticUpdate.current);
              return;
            }
            if (e.feature && e.feature.place_name) {
              console.log('🅰️ Setting origin:', e.feature.place_name);
              setOriginName(e.feature.place_name);
              lockOrigin();
            }
          });

          dir.on("destination", (e) => {
            // Skip if this is a programmatic update or if destination is locked
            if (isOffline || destinationLocked || isProgrammaticUpdate.current) {
              console.log('🔒 Destination event blocked: offline?', isOffline, 'locked?', destinationLocked, 'programmatic?', isProgrammaticUpdate.current);
              return;
            }
            if (e.feature && e.feature.place_name) {
              console.log('🅱️ Setting destination:', e.feature.place_name);
              setDestName(e.feature.place_name);
              lockDestination();
            }
          });

          // Set up route event listener
          dir.on("route", () => {
            if (isOffline) return;
            onRouteChange();
          });
        }
      });
    } else {
      map.current.jumpTo({ center });
    }

    // Cleanup function - handle ALL controls
    return () => {
      if (map.current) {
        try {
          const mapInstance = map.current;
          
          // Clean up directions control
          if (directionsControl.current) {
            try {
              mapInstance.removeControl(directionsControl.current);
              directionsControl.current = undefined;
              console.log('🗂️ MapControls: Directions control cleaned up');
            } catch (error) {
              console.warn('🗂️ MapControls: Directions control already removed:', error);
            }
          }
          
          // Clean up options control
          if (optionsControlRef.current) {
            try {
              console.log('🗂️ MapControls: Cleaning up options control');
              mapInstance.removeControl(optionsControlRef.current);
              optionsControlRef.current = undefined;
              console.log('🗂️ MapControls: Options control cleaned up');
            } catch (error) {
              console.warn('🗂️ MapControls: Options control already removed:', error);
            }
          }
        } catch (error) {
          console.warn('Error cleaning up map controls:', error);
        }
      }
    };
  }, [region, isOffline, units, unitsLoading]); // Add units and loading dependencies

  // Handle travel mode changes
  useEffect(() => {
    if (directionsControl.current && !isOffline) {
      if (typeof directionsControl.current.setProfile === 'function') {
        const profile = travelMode === 'traffic' ? 'mapbox/driving-traffic' : `mapbox/${travelMode}`;
        try {
          directionsControl.current.setProfile(profile);
        } catch (error) {
          console.warn('Error setting travel mode profile:', error);
        }
      }
    }
  }, [travelMode, isOffline]);

  // Update map options control when POI filters change
  useEffect(() => {
    if (optionsControlRef.current) {
      optionsControlRef.current.updateOptions({ poiFilters });
    }
  }, [poiFilters]);

  // Update routing options when exclude, annotations or vehicle change
  useEffect(() => {
    if (directionsControl.current && !isOffline) {
      try {
        directionsControl.current.actions.setOptions({
          exclude: exclude.length ? exclude.join(',') : undefined,
          annotations: annotations.length ? annotations.join(',') : undefined,
          vehicle
        });
      } catch (error) {
        console.warn('Error updating directions options:', error);
      }
    }
  }, [exclude, annotations, vehicle, isOffline]);

  // Pin-drop mode for waypoints only (never replace origin/destination)
  useEffect(() => {
    if (!map.current || isOffline) return;
    
    const onClick = async (e: mapboxgl.MapMouseEvent) => {
      if (!adding) return;
      
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const place = await reverseGeocode(coords);
      const newWp: Waypoint = { coords, name: place };
      
      // Always insert waypoints between origin and destination
      setWaypoints([...waypoints, newWp]);
      
      const el = document.createElement("div");
      el.className = "text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center";
      el.innerText = String(waypoints.length + 1);
      new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map.current!);
      
      // Insert waypoint between origin and destination (never replace them)
      if (directionsControl.current && typeof directionsControl.current.addWaypoint === 'function') {
        try {
          // Get current route state
          const origin = directionsControl.current.getOrigin();
          const destination = directionsControl.current.getDestination();
          const currentWaypoints = directionsControl.current.getWaypoints();
          
          // Only add waypoint if we have both origin and destination
          if (origin && destination) {
            console.log('📍 Adding waypoint between A and B. Origin locked:', originLocked, 'Destination locked:', destinationLocked);
            
            // Set flag to prevent event handlers from firing during programmatic update
            isProgrammaticUpdate.current = true;
            
            // Store current origin and destination to restore if they get overwritten
            const savedOrigin = origin;
            const savedDestination = destination;
            const savedOriginName = originName;
            const savedDestName = destName;
            
            console.log('💾 Saved A point:', savedOriginName, 'B point:', savedDestName);
            
            // Insert at the end of current waypoints (between origin and destination)
            const insertIndex = currentWaypoints.length;
            console.log('➕ Calling addWaypoint at index:', insertIndex);
            directionsControl.current.addWaypoint(insertIndex, coords);
            
            // Extended timeout and restore mechanism
            setTimeout(() => {
              console.log('🔍 Checking if A/B points were preserved...');
              
              // Double-check that origin and destination haven't been changed
              const currentOrigin = directionsControl.current?.getOrigin();
              const currentDestination = directionsControl.current?.getDestination();
              
              // If they were changed during waypoint insertion, restore them
              if (directionsControl.current) {
                if (!currentOrigin || (currentOrigin.geometry.coordinates[0] !== savedOrigin.geometry.coordinates[0] || 
                                     currentOrigin.geometry.coordinates[1] !== savedOrigin.geometry.coordinates[1])) {
                  console.log('🚨 Origin was changed! Restoring:', savedOriginName);
                  directionsControl.current.setOrigin(savedOrigin.geometry.coordinates);
                  setOriginName(savedOriginName);
                }
                
                if (!currentDestination || (currentDestination.geometry.coordinates[0] !== savedDestination.geometry.coordinates[0] || 
                                           currentDestination.geometry.coordinates[1] !== savedDestination.geometry.coordinates[1])) {
                  console.log('🚨 Destination was changed! Restoring:', savedDestName);
                  directionsControl.current.setDestination(savedDestination.geometry.coordinates);
                  setDestName(savedDestName);
                }
              }
              
              console.log('✅ A/B point protection complete');
              isProgrammaticUpdate.current = false;
            }, 500); // Increased timeout from 100ms to 500ms
          } else {
            // Show user feedback when trying to add waypoint without A/B points
            console.log('Cannot add waypoint: Origin or destination not set. Please set both A and B points first.');
            toast({
              title: "Cannot add waypoint",
              description: "Please set both origin (A) and destination (B) points before adding waypoints.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.warn('Error adding waypoint:', error);
        }
      }
      
      setAdding(false);
      map.current!.getCanvas().style.cursor = "";
    };
    
    map.current.on("click", onClick);
    
    return () => {
      if (map.current) {
        map.current.off("click", onClick);
      }
    };
  }, [adding, waypoints, setWaypoints, setAdding, isOffline]);

  // Manual waypoint creation mode
  useEffect(() => {
    if (!map.current || !manualMode || isOffline) return;
    
    const onClick = async (e: mapboxgl.MapMouseEvent) => {
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      
      // Create a new manual waypoint
      const newWaypoint: ManualWaypoint = {
        id: `manual-${Date.now()}`,
        latitude: e.lngLat.lat,
        longitude: e.lngLat.lng,
        order: manualWaypoints.length,
        isLocked: true
      };
      
      // Add to parent state
      onManualWaypointAdd(newWaypoint);
      
      // Create a visual marker
      const el = document.createElement("div");
      el.className = "manual-waypoint-marker";
      el.style.cssText = `
        width: 24px;
        height: 24px;
        background: #dc2626;
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
      el.innerText = String(manualWaypoints.length + 1);
      
      // Add click handler to remove waypoint
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onManualWaypointRemove(newWaypoint.id);
      });
      
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map.current!);
      
      manualWaypointMarkers.current.push(marker);
      
      toast({
        title: "Manual waypoint added",
        description: `Added waypoint ${manualWaypoints.length + 1}. Click the marker to remove it.`,
      });
    };
    
    // Change cursor to indicate manual mode
    if (map.current) {
      map.current.getCanvas().style.cursor = "crosshair";
      map.current.on("click", onClick);
    }
    
    return () => {
      if (map.current) {
        map.current.off("click", onClick);
        map.current.getCanvas().style.cursor = "";
      }
    };
  }, [manualMode, manualWaypoints, onManualWaypointAdd, onManualWaypointRemove, isOffline]);

  // Update manual waypoint markers when waypoints change
  useEffect(() => {
    if (!map.current) return;
    
    // Clear existing markers
    manualWaypointMarkers.current.forEach(marker => marker.remove());
    manualWaypointMarkers.current = [];
    
    // Add markers for current waypoints
    manualWaypoints.forEach((waypoint, index) => {
      const el = document.createElement("div");
      el.className = "manual-waypoint-marker";
      el.style.cssText = `
        width: 24px;
        height: 24px;
        background: #dc2626;
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
      el.innerText = String(index + 1);
      
      // Add click handler to remove waypoint
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onManualWaypointRemove(waypoint.id);
      });
      
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([waypoint.longitude, waypoint.latitude])
        .addTo(map.current!);
      
      manualWaypointMarkers.current.push(marker);
    });
  }, [manualWaypoints, onManualWaypointRemove]);

  return (
    <div className="w-full h-[60vh] lg:h-[70vh] relative">
      <div className="overflow-hidden rounded-lg border h-full">
        <div ref={mapContainer} className="h-full w-full relative" />
        <POILayer map={map} filters={poiFilters} />
{/* MundiLayer removed - functionality deleted */}
        {/* Map Options Control is now a native map control added in useEffect */}
        
        {isOffline && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white p-4 rounded-lg shadow-lg text-center pointer-events-auto">
              <p className="text-gray-600">Map updates disabled in offline mode</p>
            </div>
          </div>
        )}
        
        {/* Visual indicators for locked points, manual mode, and location tracking */}
        {(originLocked || destinationLocked || manualMode || locationTracking.isTracking) && (
          <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2">
            <div className="flex gap-2 text-xs">
              {originLocked && (
                <div className="flex items-center gap-1 text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>A Locked</span>
                </div>
              )}
              {destinationLocked && (
                <div className="flex items-center gap-1 text-purple-600">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <span>B Locked</span>
                </div>
              )}
              {manualMode && (
                <div className="flex items-center gap-1 text-red-600">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                  <span>Manual Mode</span>
                </div>
              )}
              {locationTracking.isTracking && (
                <div className="flex items-center gap-1 text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                  <span>Live on Map</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
