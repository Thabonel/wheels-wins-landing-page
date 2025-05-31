
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";

interface GeocodeSearchProps {
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
}

export default function GeocodeSearch({ directionsControl }: GeocodeSearchProps) {
  const geocoderContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!geocoderContainer.current || !directionsControl.current) return;

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl,
      placeholder: "Search for places to add to your route",
      marker: false,
    });

    // Handle geocoder result
    geocoder.on('result', (e) => {
      const coordinates = e.result.geometry.coordinates as [number, number];
      const placeName = e.result.place_name;
      
      // Add to directions as waypoint or origin/destination
      if (directionsControl.current) {
        const origin = directionsControl.current.getOrigin();
        const destination = directionsControl.current.getDestination();
        
        if (!origin) {
          directionsControl.current.setOrigin(coordinates);
        } else if (!destination) {
          directionsControl.current.setDestination(coordinates);
        } else {
          // Add as waypoint
          const waypoints = directionsControl.current.getWaypoints();
          directionsControl.current.addWaypoint(waypoints.length, coordinates);
        }
      }
    });

    const geocoderElement = geocoder.onAdd();
    geocoderContainer.current.appendChild(geocoderElement);

    return () => {
      if (geocoderContainer.current && geocoderElement) {
        geocoderContainer.current.removeChild(geocoderElement);
      }
    };
  }, [directionsControl]);

  return (
    <div className="w-full">
      <div
        ref={geocoderContainer}
        className="w-full [&_.mapboxgl-ctrl-geocoder]:w-full [&_.mapboxgl-ctrl-geocoder]:max-w-none [&_.mapboxgl-ctrl-geocoder]:rounded-lg [&_.mapboxgl-ctrl-geocoder]:border [&_.mapboxgl-ctrl-geocoder]:shadow-sm"
      />
    </div>
  );
}
