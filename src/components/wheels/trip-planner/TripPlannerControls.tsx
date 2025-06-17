
import RouteInputs from "./RouteInputs";
import TravelModeButtons from "./TravelModeButtons";
import TripControls from "./TripControls";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import mapboxgl from "mapbox-gl";

interface TripPlannerControlsProps {
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
  originName: string;
  destName: string;
  setOriginName: (name: string) => void;
  setDestName: (name: string) => void;
  travelMode: string;
  setTravelMode: (mode: string) => void;
  mode: string;
  setMode: (mode: string) => void;
  adding: boolean;
  setAdding: (adding: boolean) => void;
  onSubmitTrip: () => void;
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  isOffline: boolean;
}

export default function TripPlannerControls({
  directionsControl,
  originName,
  destName,
  setOriginName,
  setDestName,
  travelMode,
  setTravelMode,
  mode,
  setMode,
  adding,
  setAdding,
  onSubmitTrip,
  map,
  isOffline,
}: TripPlannerControlsProps) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Inputs */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Route</h3>
          <RouteInputs
            directionsControl={directionsControl}
            originName={originName}
            destName={destName}
            setOriginName={setOriginName}
            setDestName={setDestName}
          />
        </div>

        {/* Travel Mode Selection */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Travel Mode</h3>
          <TravelModeButtons
            activeMode={travelMode}
            onModeChange={setTravelMode}
          />
        </div>

        {/* Trip Controls */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
          <TripControls
            mode={mode}
            setMode={setMode}
            adding={adding}
            setAdding={setAdding}
            onSubmitTrip={onSubmitTrip}
            map={map}
            isOffline={isOffline}
          />
        </div>
      </div>
    </div>
  );
}
