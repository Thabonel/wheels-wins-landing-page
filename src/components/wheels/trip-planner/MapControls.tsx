
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import { getMapboxToken } from "@/utils/mapboxToken";
import { regionCenters } from "./constants";
import { reverseGeocode } from "./utils";
import { Waypoint } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus } from "lucide-react";
import FriendsLayer from "./FriendsLayer";

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
  originLocked,
  destinationLocked,
  lockOrigin,
  lockDestination,
}: MapControlsProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [showFriendsLayer, setShowFriendsLayer] = useState(false);

  // Initialize map and directions
  useEffect(() => {
    if (!mapContainer.current) return;
    
    const center = regionCenters[region] || regionCenters.US;

    if (!map.current) {
      const mapboxToken = getMapboxToken();
      console.log('Initializing map with token:', mapboxToken ? 'Token present' : 'Token missing');

      mapboxgl.accessToken = mapboxToken || '';

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center,
        zoom: 3.5,
      });
      
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Wait for map to load before creating directions control
      map.current.on('load', () => {
        if (!directionsControl.current && map.current) {
          console.log('Creating directions control after map load');
          
          // Create directions control
          const token = getMapboxToken();
          const dir = new MapboxDirections({
            accessToken: token || '',
            unit: "metric",
            profile: `mapbox/${travelMode === 'traffic' ? 'driving-traffic' : travelMode}`,
            interactive: !isOffline,
            controls: { instructions: false },
          });
          
          directionsControl.current = dir;
          
          // Add the directions control to the map
          map.current.addControl(dir, 'top-left');

          // Set up event listeners for origin/destination changes
          dir.on("origin", (e) => {
            if (isOffline) return;
            if (e.feature && e.feature.place_name) {
              setOriginName(e.feature.place_name);
              if (!originLocked) {
                lockOrigin();
              }
            }
          });

          dir.on("destination", (e) => {
            if (isOffline) return;
            if (e.feature && e.feature.place_name) {
              setDestName(e.feature.place_name);
              if (!destinationLocked) {
                lockDestination();
              }
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
  }, [region, isOffline]);

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
          // Always insert before the last waypoint (destination)
          const currentWaypoints = directionsControl.current.getWaypoints();
          const insertIndex = Math.max(0, currentWaypoints.length - 1);
          directionsControl.current.addWaypoint(insertIndex, coords);
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
        
        {/* Social Controls */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Button
            variant={showFriendsLayer ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFriendsLayer(!showFriendsLayer)}
            className="bg-white/90 backdrop-blur-sm"
            disabled={isOffline}
          >
            <Users className="w-4 h-4 mr-2" />
            Friends
            {showFriendsLayer && <Badge variant="secondary" className="ml-2">3</Badge>}
          </Button>
        </div>

        {isOffline && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg shadow-lg text-center">
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

      {/* Friends Layer */}
      <FriendsLayer map={map} isVisible={showFriendsLayer} />
    </div>
  );
}
