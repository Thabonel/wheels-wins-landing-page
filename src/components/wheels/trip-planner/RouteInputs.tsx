
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";

interface RouteInputsProps {
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
  originName: string;
  destName: string;
  setOriginName: (name: string) => void;
  setDestName: (name: string) => void;
}

export default function RouteInputs({
  directionsControl,
  originName,
  destName,
  setOriginName,
  setDestName,
}: RouteInputsProps) {
  const originGeocoderContainer = useRef<HTMLDivElement>(null);
  const destGeocoderContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!originGeocoderContainer.current || !directionsControl.current) return;

    // Create origin geocoder
    const originGeocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl,
      placeholder: "Choose starting point",
      marker: false,
    });

    // Handle origin selection
    originGeocoder.on('result', (e) => {
      const coordinates = e.result.geometry.coordinates as [number, number];
      const placeName = e.result.place_name;
      
      setOriginName(placeName);
      if (directionsControl.current) {
        directionsControl.current.setOrigin(coordinates);
      }
    });

    const originElement = originGeocoder.onAdd();
    originGeocoderContainer.current.appendChild(originElement);

    return () => {
      if (originGeocoderContainer.current && originElement) {
        originGeocoderContainer.current.removeChild(originElement);
      }
    };
  }, [directionsControl, setOriginName]);

  useEffect(() => {
    if (!destGeocoderContainer.current || !directionsControl.current) return;

    // Create destination geocoder
    const destGeocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl,
      placeholder: "Choose destination",
      marker: false,
    });

    // Handle destination selection
    destGeocoder.on('result', (e) => {
      const coordinates = e.result.geometry.coordinates as [number, number];
      const placeName = e.result.place_name;
      
      setDestName(placeName);
      if (directionsControl.current) {
        directionsControl.current.setDestination(coordinates);
      }
    });

    const destElement = destGeocoder.onAdd();
    destGeocoderContainer.current.appendChild(destElement);

    return () => {
      if (destGeocoderContainer.current && destElement) {
        destGeocoderContainer.current.removeChild(destElement);
      }
    };
  }, [directionsControl, setDestName]);

  return (
    <div className="space-y-3">
      {/* Origin Input */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
          A
        </div>
        <div className="flex-1">
          <div
            ref={originGeocoderContainer}
            className="w-full [&_.mapboxgl-ctrl-geocoder]:w-full [&_.mapboxgl-ctrl-geocoder]:max-w-none [&_.mapboxgl-ctrl-geocoder]:rounded-lg [&_.mapboxgl-ctrl-geocoder]:border [&_.mapboxgl-ctrl-geocoder]:shadow-sm [&_.mapboxgl-ctrl-geocoder]:border-gray-300 [&_.mapboxgl-ctrl-geocoder]:focus-within:ring-2 [&_.mapboxgl-ctrl-geocoder]:focus-within:ring-blue-500 [&_.mapboxgl-ctrl-geocoder]:focus-within:border-transparent"
          />
        </div>
      </div>

      {/* Destination Input */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
          B
        </div>
        <div className="flex-1">
          <div
            ref={destGeocoderContainer}
            className="w-full [&_.mapboxgl-ctrl-geocoder]:w-full [&_.mapboxgl-ctrl-geocoder]:max-w-none [&_.mapboxgl-ctrl-geocoder]:rounded-lg [&_.mapboxgl-ctrl-geocoder]:border [&_.mapboxgl-ctrl-geocoder]:shadow-sm [&_.mapboxgl-ctrl-geocoder]:border-gray-300 [&_.mapboxgl-ctrl-geocoder]:focus-within:ring-2 [&_.mapboxgl-ctrl-geocoder]:focus-within:ring-purple-500 [&_.mapboxgl-ctrl-geocoder]:focus-within:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
