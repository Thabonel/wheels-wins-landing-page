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

      // Add native Map Options Control
      const optionsControl = new MapOptionsControl({
        onStyleChange: setCurrentStyle,
        currentStyle,
        poiFilters,
        onPOIFilterChange: setPOIFilters
      });
      optionsControlRef.current = optionsControl;
      map.current.addControl(optionsControl, 'top-right');

      // Wait for map to load before creating directions control
      map.current.on('load', () => {
        if (!directionsControl.current && map.current) {
          console.log('Creating directions control after map load');
          
          // Map route types to Mapbox Directions API optimization
          const getOptimization = (routeType: string) => {
            switch (routeType) {
              case 'fastest':
                return 'time';
              case 'shortest':
                return 'distance';
              case 'scenic':
                return 'time'; // Use time but prefer scenic routes
              case 'off_grid':
                return 'distance'; // Use distance and avoid highways
              case 'luxury':
                return 'time'; // Use time but prefer premium routes
              case 'manual':
                return 'time'; // Use time for manual waypoints
              default:
                return 'time';
            }
          };

          // Configure route-specific exclusions
          const getRouteExclusions = (routeType: string, baseExclude: string[]) => {
            const exclusions = [...baseExclude];
            
            switch (routeType) {
              case 'scenic':
                // Scenic routes avoid highways when possible
                if (!exclusions.includes('motorway')) {
                  exclusions.push('motorway');
                }
                break;
              case 'off_grid':
                // Off-grid routes avoid major highways and prefer rural roads
                if (!exclusions.includes('motorway')) {
                  exclusions.push('motorway');
                }
                if (!exclusions.includes('trunk')) {
                  exclusions.push('trunk');
                }
                break;
              case 'luxury':
                // Luxury routes avoid unpaved roads
                if (!exclusions.includes('unpaved')) {
                  exclusions.push('unpaved');
                }
                break;
            }
            
            return exclusions;
          };

          // Configure vehicle-specific routing parameters
          const getVehicleConfig = (vehicle: string, baseExclude: string[]) => {
            const config = {
              profile: `mapbox/${travelMode === 'traffic' ? 'driving-traffic' : travelMode}`,
              exclude: [...baseExclude],
              annotations: [...annotations]
            };

            switch (vehicle) {
              case 'truck':
                // Trucks need to avoid weight/height restrictions
                config.exclude = [...config.exclude, 'restricted'];
                // Add truck-specific annotations for weight limits
                if (!config.annotations.includes('maxweight')) {
                  config.annotations.push('maxweight');
                }
                if (!config.annotations.includes('maxheight')) {
                  config.annotations.push('maxheight');
                }
                break;
              
              case 'bus':
                // Buses avoid narrow roads and have passenger considerations
                config.exclude = [...config.exclude, 'restricted'];
                // Buses prefer main roads for passenger comfort
                if (config.exclude.includes('motorway')) {
                  config.exclude = config.exclude.filter(e => e !== 'motorway');
                }
                break;
              
              case 'motorcycle':
                // Motorcycles can use more road types but avoid highways in bad weather
                // They prefer scenic routes when possible
                if (!config.exclude.includes('ferry')) {
                  // Motorcycles generally avoid ferries due to boarding complexity
                  config.exclude.push('ferry');
                }
                break;
              
              case 'car':
              default:
                // Cars use standard routing - no special restrictions
                break;
            }

            return config;
          };

          const routeExclusions = getRouteExclusions(routeType, exclude);
          const vehicleConfig = getVehicleConfig(vehicle, routeExclusions);
          
          // Create directions control with dynamic units, route type, and vehicle optimization
          const dir = new MapboxDirections({
            accessToken: mapboxgl.accessToken,
            unit: units, // Dynamic units based on user's address/region
            profile: vehicleConfig.profile,
            interactive: !isOffline,
            controls: {
              instructions: true, // Enable turn-by-turn instructions like Roadtrippers
              inputs: true,
              profileSwitcher: true // Allow switching between driving/walking/cycling
            },
            alternatives: true, // Show alternative routes like Roadtrippers
            congestion: annotations.includes('congestion'), // Show traffic congestion if selected
            exclude: vehicleConfig.exclude.length ? vehicleConfig.exclude.join(',') : undefined,
            annotations: vehicleConfig.annotations.length ? vehicleConfig.annotations.join(',') : undefined,
            flyTo: true, // Smooth camera transitions
            placeholderOrigin: 'Choose starting point',
            placeholderDestination: 'Choose destination',
            zoom: 15, // Higher zoom for detailed route viewing
            // Apply route type optimization
            optimization: getOptimization(routeType)
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

    // Cleanup function
    return () => {
      if (map.current && directionsControl.current) {
        try {
          const mapInstance = map.current;
          const dirControl = directionsControl.current;
          
          if (mapInstance.hasControl && mapInstance.hasControl(dirControl)) {
            mapInstance.removeControl(dirControl);
          }
          
          directionsControl.current = undefined;
        } catch (error) {
          console.warn('Error cleaning up directions control:', error);
        }
      }
    };
  }, [region, isOffline, units, unitsLoading, routeType]); // Add units, loading, and routeType dependencies

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

  // Handle route type changes dynamically
  useEffect(() => {
    if (directionsControl.current && !isOffline) {
      // Route type change requires recreating the route with new optimization
      const getOptimization = (routeType: string) => {
        switch (routeType) {
          case 'fastest':
            return 'time';
          case 'shortest':
            return 'distance';
          case 'scenic':
            return 'time'; // Use time but prefer scenic routes
          case 'off_grid':
            return 'distance'; // Use distance and avoid highways
          case 'luxury':
            return 'time'; // Use time but prefer premium routes
          case 'manual':
            return 'time'; // Use time for manual waypoints
          default:
            return 'time';
        }
      };

      // Configure route-specific exclusions
      const getRouteExclusions = (routeType: string, baseExclude: string[]) => {
        const exclusions = [...baseExclude];
        
        switch (routeType) {
          case 'scenic':
            // Scenic routes avoid highways when possible
            if (!exclusions.includes('motorway')) {
              exclusions.push('motorway');
            }
            break;
          case 'off_grid':
            // Off-grid routes avoid major highways and prefer rural roads
            if (!exclusions.includes('motorway')) {
              exclusions.push('motorway');
            }
            if (!exclusions.includes('trunk')) {
              exclusions.push('trunk');
            }
            break;
          case 'luxury':
            // Luxury routes avoid unpaved roads
            if (!exclusions.includes('unpaved')) {
              exclusions.push('unpaved');
            }
            break;
        }
        
        return exclusions;
      };

      // Configure vehicle-specific routing parameters (same logic as initialization)
      const getVehicleConfig = (vehicle: string, baseExclude: string[]) => {
        const config = {
          profile: `mapbox/${travelMode === 'traffic' ? 'driving-traffic' : travelMode}`,
          exclude: [...baseExclude],
          annotations: [...annotations]
        };

        switch (vehicle) {
          case 'truck':
            config.exclude = [...config.exclude, 'restricted'];
            if (!config.annotations.includes('maxweight')) {
              config.annotations.push('maxweight');
            }
            if (!config.annotations.includes('maxheight')) {
              config.annotations.push('maxheight');
            }
            break;
          
          case 'bus':
            config.exclude = [...config.exclude, 'restricted'];
            if (config.exclude.includes('motorway')) {
              config.exclude = config.exclude.filter(e => e !== 'motorway');
            }
            break;
          
          case 'motorcycle':
            if (!config.exclude.includes('ferry')) {
              config.exclude.push('ferry');
            }
            break;
          
          case 'car':
          default:
            break;
        }

        return config;
      };

      const routeExclusions = getRouteExclusions(routeType, exclude);
      const vehicleConfig = getVehicleConfig(vehicle, routeExclusions);
      
      try {
        // Update options with new route type and vehicle configuration
        directionsControl.current.actions.setOptions({
          exclude: vehicleConfig.exclude.length ? vehicleConfig.exclude.join(',') : undefined,
          annotations: vehicleConfig.annotations.length ? vehicleConfig.annotations.join(',') : undefined,
          optimization: getOptimization(routeType)
        });
        
        // Force route recalculation if we have origin and destination
        const origin = directionsControl.current.getOrigin();
        const destination = directionsControl.current.getDestination();
        if (origin && destination) {
          console.log(`🔄 Recalculating route with ${routeType} optimization for ${vehicle}`);
          // Trigger route recalculation by setting the destination again
          directionsControl.current.setDestination(destination.geometry.coordinates);
        }
      } catch (error) {
        console.warn('Error updating route type options:', error);
      }
    }
  }, [routeType, isOffline, exclude, annotations, vehicle]);

  // This useEffect is now redundant since vehicle changes are handled above with route type
  // Keeping for any future basic parameter updates not related to vehicle/route type

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
