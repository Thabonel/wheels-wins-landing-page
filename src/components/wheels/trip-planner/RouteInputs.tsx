
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import { getMapboxToken } from "@/utils/mapboxToken";
import { Lock } from "lucide-react";

interface RouteInputsProps {
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
  originName: string;
  destName: string;
  setOriginName: (name: string) => void;
  setDestName: (name: string) => void;
  originLocked?: boolean;
  destinationLocked?: boolean;
  lockOrigin?: () => void;
  lockDestination?: () => void;
}

export default function RouteInputs({
  directionsControl,
  originName,
  destName,
  setOriginName,
  setDestName,
  originLocked = false,
  destinationLocked = false,
  lockOrigin,
  lockDestination,
}: RouteInputsProps) {
  const originGeocoderContainer = useRef<HTMLDivElement>(null);
  const destGeocoderContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!originGeocoderContainer.current || !directionsControl.current || originLocked) return;

    // Create origin geocoder only if not locked
    const originGeocoder = new MapboxGeocoder({
      accessToken: getMapboxToken() || '',
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
      
      // Lock the origin after setting it
      if (lockOrigin) {
        lockOrigin();
      }
    });

    const originElement = originGeocoder.onAdd();
    originGeocoderContainer.current.appendChild(originElement);

    return () => {
      if (originGeocoderContainer.current && originElement) {
        originGeocoderContainer.current.removeChild(originElement);
      }
    };
  }, [directionsControl, setOriginName, originLocked, lockOrigin]);

  useEffect(() => {
    if (!destGeocoderContainer.current || !directionsControl.current || destinationLocked) return;

    // Create destination geocoder only if not locked
    const destGeocoder = new MapboxGeocoder({
      accessToken: getMapboxToken() || '',
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
      
      // Lock the destination after setting it
      if (lockDestination) {
        lockDestination();
      }
    });

    const destElement = destGeocoder.onAdd();
    destGeocoderContainer.current.appendChild(destElement);

    return () => {
      if (destGeocoderContainer.current && destElement) {
        destGeocoderContainer.current.removeChild(destElement);
      }
    };
  }, [directionsControl, setDestName, destinationLocked, lockDestination]);

  return (
    <div className="space-y-3">
      {/* Origin Input */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
          A
        </div>
        <div className="flex-1">
          {originLocked && originName ? (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Lock className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">{originName}</span>
            </div>
          ) : (
            <div
              ref={originGeocoderContainer}
              className="w-full [&_.mapboxgl-ctrl-geocoder]:w-full [&_.mapboxgl-ctrl-geocoder]:max-w-none [&_.mapboxgl-ctrl-geocoder]:rounded-lg [&_.mapboxgl-ctrl-geocoder]:border [&_.mapboxgl-ctrl-geocoder]:shadow-sm [&_.mapboxgl-ctrl-geocoder]:border-gray-300 [&_.mapboxgl-ctrl-geocoder]:focus-within:ring-2 [&_.mapboxgl-ctrl-geocoder]:focus-within:ring-blue-500 [&_.mapboxgl-ctrl-geocoder]:focus-within:border-transparent"
            />
          )}
        </div>
      </div>

      {/* Destination Input */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
          B
        </div>
        <div className="flex-1">
          {destinationLocked && destName ? (
            <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
              <Lock className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-800">{destName}</span>
            </div>
          ) : (
            <div
              ref={destGeocoderContainer}
              className="w-full [&_.mapboxgl-ctrl-geocoder]:w-full [&_.mapboxgl-ctrl-geocoder]:max-w-none [&_.mapboxgl-ctrl-geocoder]:rounded-lg [&_.mapboxgl-ctrl-geocoder]:border [&_.mapboxgl-ctrl-geocoder]:shadow-sm [&_.mapboxgl-ctrl-geocoder]:border-gray-300 [&_.mapboxgl-ctrl-geocoder]:focus-within:ring-2 [&_.mapboxgl-ctrl-geocoder]:focus-within:ring-purple-500 [&_.mapboxgl-ctrl-geocoder]:focus-within:border-transparent"
            />
          )}
        </div>
      </div>
    </div>
  );
}
