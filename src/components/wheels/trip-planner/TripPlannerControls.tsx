import TravelModeButtons from "./TravelModeButtons";
import TripControls from "./TripControls";
import GeocodeSearch from "./GeocodeSearch";
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
  exclude: string[];
  setExclude: (values: string[]) => void;
  annotations: string[];
  setAnnotations: (values: string[]) => void;
  vehicle: string;
  setVehicle: (val: string) => void;
  mode: string;
  setMode: (mode: string) => void;
  adding: boolean;
  setAdding: (adding: boolean) => void;
  onSubmitTrip: () => void;
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  isOffline: boolean;
  originLocked?: boolean;
  destinationLocked?: boolean;
  lockOrigin?: () => void;
  lockDestination?: () => void;
  tripId?: string | null;
  // New routing props
  routeType?: string;
  setRouteType?: (routeType: string) => void;
  manualMode?: boolean;
  setManualMode?: (enabled: boolean) => void;
}
export default function TripPlannerControls({
  directionsControl,
  originName,
  destName,
  setOriginName,
  setDestName,
  travelMode,
  setTravelMode,
  exclude,
  setExclude,
  annotations,
  setAnnotations,
  vehicle,
  setVehicle,
  mode,
  setMode,
  adding,
  setAdding,
  onSubmitTrip,
  map,
  isOffline,
  originLocked = false,
  destinationLocked = false,
  lockOrigin,
  lockDestination,
  tripId,
  routeType = "fastest",
  setRouteType = () => {},
  manualMode = false,
  setManualMode = () => {}
}: TripPlannerControlsProps) {
  return <div className="bg-white rounded-lg border p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Integration - Origin/Destination handled by map controls */}
        <div className="lg:col-span-2 space-y-6">

          {/* Waypoint Search - show when both A and B are set */}
          {originName && destName && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Add Waypoint (between A and B)
              </label>
              <GeocodeSearch 
                directionsControl={directionsControl}
                disabled={isOffline}
                originLocked={originLocked}
                destinationLocked={destinationLocked}
              />
            </div>
          )}

          {/* Travel Mode Selection */}
          <TravelModeButtons 
            activeMode={travelMode} 
            onModeChange={setTravelMode} 
            exclude={exclude} 
            onExcludeChange={setExclude} 
            annotations={annotations} 
            onAnnotationsChange={setAnnotations} 
            vehicle={vehicle} 
            onVehicleChange={setVehicle} 
            routeType={routeType}
            onRouteTypeChange={setRouteType}
            manualMode={manualMode}
            onManualModeChange={setManualMode}
          />
        </div>

        {/* Trip Controls */}
        <div className="lg:col-span-1">
          
          <TripControls mode={mode} setMode={setMode} adding={adding} setAdding={setAdding} onSubmitTrip={onSubmitTrip} map={map} isOffline={isOffline} tripId={tripId} />
        </div>
      </div>
    </div>;
}