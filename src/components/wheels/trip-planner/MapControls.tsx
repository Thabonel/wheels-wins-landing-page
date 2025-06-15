
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import { regionCenters } from "./constants";
import { reverseGeocode } from "./utils";
import { Waypoint } from "./types";

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
}: MapControlsProps) {
  const mapContainer = useRef<HTMLDivElement>(null);

  // Initialize map and directions
  useEffect(() => {
    if (!mapContainer.current) return;
    
    const center = regionCenters[region] || regionCenters.US;

    if (!map.current) {
      console.log('Initializing map with token:', import.meta.env.VITE_MAPBOX_TOKEN ? 'Token present' : 'Token missing');
      
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
          const dir = new MapboxDirections({
            accessToken: mapboxgl.accessToken,
            unit: "metric",
            profile: `mapbox/${travelMode === 'traffic' ? 'driving-traffic' : travelMode}`,
            interactive: !isOffline,
            controls: { instructions: false },
          });
          
          directionsControl.current = dir;
          
          // Add the directions control to the map - this was missing!
          map.current.addControl(dir, 'top-left');

          // Set up event listeners
          dir.on("route", async () => {
            if (isOffline) return;
            
            const o = dir.getOrigin()?.geometry.coordinates as [number, number] | undefined;
            const d = dir.getDestination()?.geometry.coordinates as [number, number] | undefined;
            if (o) setOriginName(await reverseGeocode(o));
            if (d) setDestName(await reverseGeocode(d));
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
          // Remove the directions control properly
          const mapInstance = map.current;
          const dirControl = directionsControl.current;
          
          // Check if the control is actually added to the map before removing
          if (mapInstance.hasControl && mapInstance.hasControl(dirControl)) {
            mapInstance.removeControl(dirControl);
          }
          
          // Clear the reference
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
      const profile = travelMode === 'traffic' ? 'mapbox/driving-traffic' : `mapbox/${travelMode}`;
      directionsControl.current.setProfile(profile);
    }
  }, [travelMode, isOffline]);

  // Pin-drop mode
  useEffect(() => {
    if (!map.current || isOffline) return;
    
    const onClick = async (e: mapboxgl.MapMouseEvent) => {
      if (!adding) return;
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const place = await reverseGeocode(coords);
      const newWp: Waypoint = { coords, name: place };
      setWaypoints([...waypoints, newWp]);
      const el = document.createElement("div");
      el.className = "text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center";
      el.innerText = String(waypoints.length + 1);
      new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map.current!);
      
      // FIX: Insert waypoint before destination, not replace origin
      const currentWaypoints = directionsControl.current!.getWaypoints();
      const insertIndex = currentWaypoints.length > 1 ? currentWaypoints.length - 1 : waypoints.length;
      directionsControl.current!.addWaypoint(insertIndex, coords);
      
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
        {isOffline && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg shadow-lg text-center">
              <p className="text-gray-600">Map updates disabled in offline mode</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
