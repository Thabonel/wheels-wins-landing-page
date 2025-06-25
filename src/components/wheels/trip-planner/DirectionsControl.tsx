
import { useEffect, useRef } from "react";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";

interface DirectionsControlProps {
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  disabled?: boolean;
}

export default function DirectionsControl({ directionsControl, map, disabled = false }: DirectionsControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !directionsControl.current || !map.current) return;

    try {
      // Clear any existing content first
      containerRef.current.innerHTML = '';

      // Get the directions control DOM element
      const controlElement = directionsControl.current.onAdd(map.current);
      
      // Append the control to our container
      if (controlElement && containerRef.current) {
        containerRef.current.appendChild(controlElement);

        // Style the control to fit our design
        const directionsContainer = containerRef.current.querySelector('.mapboxgl-ctrl-directions');
        if (directionsContainer) {
          (directionsContainer as HTMLElement).style.width = '100%';
          (directionsContainer as HTMLElement).style.maxWidth = 'none';
          (directionsContainer as HTMLElement).style.boxShadow = 'none';
          (directionsContainer as HTMLElement).style.border = 'none';
          (directionsContainer as HTMLElement).style.borderRadius = '0';
          
          // Disable inputs when offline
          if (disabled) {
            const inputs = directionsContainer.querySelectorAll('input');
            inputs.forEach(input => {
              (input as HTMLInputElement).disabled = true;
              (input as HTMLInputElement).style.backgroundColor = '#f3f4f6';
              (input as HTMLInputElement).style.color = '#9ca3af';
            });
          }
        }

        // Hide the directions list as we handle suggestions elsewhere
        const directionsList = containerRef.current.querySelector('.directions-control-directions');
        if (directionsList) {
          (directionsList as HTMLElement).style.display = 'none';
        }
      }
    } catch (error) {
      console.warn('Error setting up directions control DOM:', error);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [directionsControl, map, disabled]);

  return (
    <div className={`bg-white rounded-lg border p-4 ${disabled ? 'opacity-60' : ''}`}>
      <h3 className="text-sm font-medium text-gray-700 mb-3">Route Points</h3>
      {disabled && (
        <p className="text-xs text-gray-500 mb-2">Route editing disabled in offline mode</p>
      )}
      <div ref={containerRef} className="directions-control-container" />
    </div>
  );
}
