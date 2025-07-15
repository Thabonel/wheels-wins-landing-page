
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";

interface GeocodeSearchProps {
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
  disabled?: boolean;
  originLocked?: boolean;
  destinationLocked?: boolean;
}

export default function GeocodeSearch({ directionsControl, disabled = false, originLocked = false, destinationLocked = false }: GeocodeSearchProps) {
  const geocoderContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!geocoderContainer.current || !directionsControl.current || disabled) return;

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl,
      placeholder: disabled ? "Search disabled in offline mode" : "Search for places to add to your route",
      marker: false,
    });

    // Handle geocoder result
    geocoder.on('result', (e) => {
      if (disabled) return;
      
      const coordinates = e.result.geometry.coordinates as [number, number];
      const placeName = e.result.place_name;
      
      // Add to directions as waypoint or origin/destination (respecting lock state)
      if (directionsControl.current) {
        const origin = directionsControl.current.getOrigin();
        const destination = directionsControl.current.getDestination();
        
        if (!origin && !originLocked) {
          // Set as origin if no origin exists and origin is not locked
          directionsControl.current.setOrigin(coordinates);
        } else if (!destination && !destinationLocked) {
          // Set as destination if no destination exists and destination is not locked
          directionsControl.current.setDestination(coordinates);
        } else {
          // Add as waypoint between origin and destination
          // This happens when:
          // 1. Both origin and destination exist, OR
          // 2. Origin/destination is locked, OR
          // 3. User is adding intermediate stops
          const waypoints = directionsControl.current.getWaypoints();
          const insertIndex = waypoints.length;
          directionsControl.current.addWaypoint(insertIndex, coordinates);
        }
      }
    });

    const geocoderElement = geocoder.onAdd();
    geocoderContainer.current.appendChild(geocoderElement);

    // Disable the input if offline
    if (disabled) {
      const input = geocoderElement.querySelector('input');
      if (input) {
        input.disabled = true;
        input.style.backgroundColor = '#f3f4f6';
        input.style.color = '#9ca3af';
      }
    }

    return () => {
      if (geocoderContainer.current && geocoderElement) {
        geocoderContainer.current.removeChild(geocoderElement);
      }
    };
  }, [directionsControl, disabled, originLocked, destinationLocked]);

  return (
    <div className="w-full">
      <div
        ref={geocoderContainer}
        className={`w-full [&_.mapboxgl-ctrl-geocoder]:w-full [&_.mapboxgl-ctrl-geocoder]:max-w-none [&_.mapboxgl-ctrl-geocoder]:rounded-lg [&_.mapboxgl-ctrl-geocoder]:border [&_.mapboxgl-ctrl-geocoder]:shadow-sm ${
          disabled ? '[&_.mapboxgl-ctrl-geocoder]:bg-gray-100' : ''
        }`}
      />
    </div>
  );
}
