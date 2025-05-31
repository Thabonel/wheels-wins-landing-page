
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
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
}: MapControlsProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const geocoderContainer = useRef<HTMLDivElement>(null);
  const directionsContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>();

  // Initialize map, geocoder, directions
  useEffect(() => {
    if (!mapContainer.current) return;
    const center = regionCenters[region] || regionCenters.US;

    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center,
        zoom: 3.5,
      });
      map.current.addControl(new mapboxgl.NavigationControl());

      // Geocoder
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl,
        placeholder: "Search start or end",
        marker: false,
      });
      geocoderContainer.current?.appendChild(geocoder.onAdd(map.current));

      // Directions control
      const dir = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        unit: "metric",
        profile: "mapbox/driving",
        interactive: true,
        controls: { instructions: true },
      });
      directionsControl.current = dir;

      // Mount directions UI into our container
      const ui = dir.onAdd(map.current);
      directionsContainer.current?.appendChild(ui);

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Map */}
      <div className="lg:col-span-2 overflow-hidden rounded-lg border">
        <div ref={mapContainer} className="h-[600px] w-full" />
      </div>
      
      {/* Directions panel */}
      <div className="lg:col-span-1">
        <div
          ref={directionsContainer}
          className="bg-white rounded-lg border p-4 h-[600px] overflow-y-auto"
        />
      </div>

      {/* Hidden geocoder container */}
      <div
        ref={geocoderContainer}
        className="w-full max-w-md p-2 border rounded bg-white shadow-md mt-1"
      />
    </div>
  );
}
