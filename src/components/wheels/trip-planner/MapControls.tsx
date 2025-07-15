import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import { regionCenters } from "./constants";
import { reverseGeocode } from "./utils";
import { Waypoint } from "./types";
import { useUserUnits } from "./hooks/useUserUnits";
import { MapOptionsControl } from "./MapOptionsControl";
import POILayer from "./POILayer";
import MundiLayer from "./MundiLayer";
import { toast } from "@/hooks/use-toast";

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
}: MapControlsProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const { units, loading: unitsLoading } = useUserUnits();
  const [currentStyle, setCurrentStyle] = useState("mapbox://styles/mapbox/streets-v11");
  const [poiFilters, setPOIFilters] = useState<Record<string, boolean>>({
    pet_stop: true,
    wide_parking: true,
    medical: true,
    farmers_market: true
  });
  const [mundiLayerVisible, setMundiLayerVisible] = useState(true);
  const optionsControlRef = useRef<MapOptionsControl>();
  const isProgrammaticUpdate = useRef(false);

  // Initialize map and directions
  useEffect(() => {
    if (!mapContainer.current || unitsLoading) return;
    
    const center = regionCenters[region] || regionCenters.US;

    if (!map.current) {
      console.log('Initializing map with token:', import.meta.env.VITE_MAPBOX_TOKEN ? 'Token present' : 'Token missing');
      mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center,
        zoom: 3.5,
        hash: true, // Enable URL hash for sharing map state
        projection: 'mercator'
      });
      
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
        onPOIFilterChange: setPOIFilters,
        mundiLayerVisible,
        onMundiLayerToggle: setMundiLayerVisible
      });
      optionsControlRef.current = optionsControl;
      map.current.addControl(optionsControl, 'top-right');

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
            if (isOffline || originLocked || isProgrammaticUpdate.current) return;
            if (e.feature && e.feature.place_name) {
              setOriginName(e.feature.place_name);
              lockOrigin();
            }
          });

          dir.on("destination", (e) => {
            // Skip if this is a programmatic update or if destination is locked
            if (isOffline || destinationLocked || isProgrammaticUpdate.current) return;
            if (e.feature && e.feature.place_name) {
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

  // Update map options control when Mundi layer visibility changes
  useEffect(() => {
    if (optionsControlRef.current) {
      optionsControlRef.current.updateOptions({ mundiLayerVisible });
    }
  }, [mundiLayerVisible]);
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
            // Set flag to prevent event handlers from firing during programmatic update
            isProgrammaticUpdate.current = true;
            
            // Insert at the end of current waypoints (between origin and destination)
            const insertIndex = currentWaypoints.length;
            directionsControl.current.addWaypoint(insertIndex, coords);
            
            // Reset flag after a brief delay
            setTimeout(() => {
              isProgrammaticUpdate.current = false;
            }, 100);
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

  return (
    <div className="w-full h-[60vh] lg:h-[70vh] relative">
      <div className="overflow-hidden rounded-lg border h-full">
        <div ref={mapContainer} className="h-full w-full relative" />
        <POILayer map={map} filters={poiFilters} />
        <MundiLayer map={map.current} isVisible={mundiLayerVisible} />
        {/* Map Options Control is now a native map control added in useEffect */}
        
        {isOffline && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white p-4 rounded-lg shadow-lg text-center pointer-events-auto">
              <p className="text-gray-600">Map updates disabled in offline mode</p>
            </div>
          </div>
        )}
        
        {/* Visual indicators for locked points */}
        {(originLocked || destinationLocked) && (
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
