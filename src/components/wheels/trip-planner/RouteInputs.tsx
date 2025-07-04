
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
  lockDestination
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
      marker: false
    });

    // Handle origin selection
    originGeocoder.on('result', e => {
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
      marker: false
    });

    // Handle destination selection
    destGeocoder.on('result', e => {
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
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">From:</span>
          {originLocked && <Lock className="w-4 h-4 text-blue-600" />}
        </div>
        {originLocked ? (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
            {originName || "Origin set"}
          </div>
        ) : (
          <div ref={originGeocoderContainer} className="w-full" />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">To:</span>
          {destinationLocked && <Lock className="w-4 h-4 text-purple-600" />}
        </div>
        {destinationLocked ? (
          <div className="p-2 bg-purple-50 border border-purple-200 rounded text-sm">
            {destName || "Destination set"}
          </div>
        ) : (
          <div ref={destGeocoderContainer} className="w-full" />
        )}
      </div>
    </div>
  );
}
