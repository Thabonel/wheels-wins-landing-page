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
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        
        <div ref={originGeocoderContainer} className="geocoder-container" />
      </div>
      <div>
        
        <div ref={destGeocoderContainer} className="geocoder-container" />
      </div>
    </div>;
}