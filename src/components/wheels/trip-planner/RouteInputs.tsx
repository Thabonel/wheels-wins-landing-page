
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { reverseGeocode } from "./utils";
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
  const [localOrigin, setLocalOrigin] = useState(originName);
  const [localDest, setLocalDest] = useState(destName);

  useEffect(() => {
    setLocalOrigin(originName);
  }, [originName]);

  useEffect(() => {
    setLocalDest(destName);
  }, [destName]);

  const handleOriginChange = (value: string) => {
    setLocalOrigin(value);
    setOriginName(value);
  };

  const handleDestChange = (value: string) => {
    setLocalDest(value);
    setDestName(value);
  };

  return (
    <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 w-80 max-w-[calc(100vw-2rem)] lg:block hidden">
      {/* Origin Input */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
          A
        </div>
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={localOrigin}
            onChange={(e) => handleOriginChange(e.target.value)}
            placeholder="Choose starting point"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Destination Input */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
          B
        </div>
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={localDest}
            onChange={(e) => handleDestChange(e.target.value)}
            placeholder="Choose destination"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>
      </div>
    </div>
  );
}
