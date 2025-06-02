
import { useEffect, useRef } from "react";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";

interface DirectionsControlProps {
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
}

export default function DirectionsControl({ directionsControl, map }: DirectionsControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !directionsControl.current || !map.current) return;

    // Get the directions control DOM element
    const controlElement = directionsControl.current.onAdd(map.current);
    
    // Clear any existing content
    containerRef.current.innerHTML = '';
    
    // Append the control to our container
    containerRef.current.appendChild(controlElement);

    // Style the control to fit our design
    const directionsContainer = containerRef.current.querySelector('.mapboxgl-ctrl-directions');
    if (directionsContainer) {
      (directionsContainer as HTMLElement).style.width = '100%';
      (directionsContainer as HTMLElement).style.maxWidth = 'none';
      (directionsContainer as HTMLElement).style.boxShadow = 'none';
      (directionsContainer as HTMLElement).style.border = 'none';
      (directionsContainer as HTMLElement).style.borderRadius = '0';
    }

    // Hide the directions list as we handle suggestions elsewhere
    const directionsList = containerRef.current.querySelector('.directions-control-directions');
    if (directionsList) {
      (directionsList as HTMLElement).style.display = 'none';
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [directionsControl, map]);

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Route Points</h3>
      <div ref={containerRef} className="directions-control-container" />
    </div>
  );
}
