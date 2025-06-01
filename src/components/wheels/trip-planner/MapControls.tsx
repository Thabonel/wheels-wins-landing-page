
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

      // Directions control
      const dir = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        unit: "metric",
        profile: "mapbox/driving",
        interactive: true,
        controls: { instructions: false },
      });
      directionsControl.current = dir;

      // Add directions to map (but hide the default UI)
      map.current.addControl(dir);

      dir.on("route", async () => {
        const o = dir.getOrigin()?.geometry.coordinates as [number, number] | undefined;
        const d = dir.getDestination()?.geometry.coordinates as [number, number] | undefined;
        if (o) setOriginName(await reverseGeocode(o));
        if (d) setDestName(await reverseGeocode(d));
        onRouteChange();
      });
    } else {
      map.current.jumpTo({ center });
    }
  }, [region]);

  // Pin-drop mode
  useEffect(() => {
    if (!map.current) return;
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
      directionsControl.current!.addWaypoint(waypoints.length, coords);
      setAdding(false);
      map.current!.getCanvas().style.cursor = "";
    };
    map.current.on("click", onClick);
    return () => {
      if (map.current) {
        map.current.off("click", onClick);
      }
    };
  }, [adding, waypoints, setWaypoints, setAdding]);

  return (
    <div className="w-full h-[60vh] lg:h-[70vh] relative">
      <div className="overflow-hidden rounded-lg border h-full">
        <div ref={mapContainer} className="h-full w-full relative" />
      </div>
    </div>
  );
}
