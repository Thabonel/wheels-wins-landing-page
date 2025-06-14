
import { useRef } from "react";
import { useRegion } from "@/context/RegionContext";
import { useOffline } from "@/context/OfflineContext";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import MapControls from "./trip-planner/MapControls";
import GeocodeSearch from "./trip-planner/GeocodeSearch";
import WaypointsList from "./trip-planner/WaypointsList";
import SuggestionsGrid from "./trip-planner/SuggestionsGrid";
import TripPlannerHeader from "./trip-planner/TripPlannerHeader";
import TripPlannerControls from "./trip-planner/TripPlannerControls";
import TripPlannerTip from "./trip-planner/TripPlannerTip";
import TripPlannerLayout from "./trip-planner/TripPlannerLayout";
import { useTripPlannerState } from "./trip-planner/hooks/useTripPlannerState";
import { useTripPlannerHandlers } from "./trip-planner/hooks/useTripPlannerHandlers";

// Initialize Mapbox token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function TripPlanner() {
  const { region } = useRegion();
  const { isOffline } = useOffline();
  
  // Map and directions refs
  const map = useRef<mapboxgl.Map>();
  const directionsControl = useRef<MapboxDirections>();
  
  // State management
  const {
    originName,
    setOriginName,
    destName,
    setDestName,
    waypoints,
    setWaypoints,
    suggestions,
    setSuggestions,
    adding,
    setAdding,
    travelMode,
    setTravelMode,
    routeProfile,
    mode,
    setMode,
    saveTripData,
  } = useTripPlannerState(isOffline);

  // Event handlers
  const { handleRouteChange, handleSubmitTrip } = useTripPlannerHandlers({
    directionsControl,
    originName,
    destName,
    waypoints,
    setSuggestions,
    saveTripData,
    routeProfile,
    mode,
  });

  if (!mapboxgl.accessToken) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800">Mapbox Configuration Required</h3>
        <p className="text-yellow-700 mt-2">
          Please add your Mapbox access token to enable the trip planner functionality.
        </p>
      </div>
    );
  }

  return (
    <TripPlannerLayout>
      <TripPlannerHeader isOffline={isOffline} />
      
      {/* Main Map Section */}
      <div className="relative">
        <MapControls
          region={region}
          waypoints={waypoints}
          setWaypoints={setWaypoints}
          adding={adding}
          setAdding={setAdding}
          setOriginName={setOriginName}
          setDestName={setDestName}
          onRouteChange={handleRouteChange}
          directionsControl={directionsControl}
          originName={originName}
          destName={destName}
          travelMode={travelMode}
          onTravelModeChange={setTravelMode}
          map={map}
          isOffline={isOffline}
        />
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg border p-4">
        <GeocodeSearch
          directionsControl={directionsControl}
          disabled={isOffline}
        />
      </div>

      {/* Unified Controls Section */}
      <TripPlannerControls
        directionsControl={directionsControl}
        originName={originName}
        destName={destName}
        setOriginName={setOriginName}
        setDestName={setDestName}
        travelMode={travelMode}
        setTravelMode={setTravelMode}
        mode={mode}
        setMode={setMode}
        adding={adding}
        setAdding={setAdding}
        onSubmitTrip={handleSubmitTrip}
        map={map}
        isOffline={isOffline}
      />

      {/* Waypoints Section */}
      {waypoints.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <WaypointsList
            waypoints={waypoints}
            setWaypoints={setWaypoints}
            directionsControl={directionsControl}
            disabled={isOffline}
          />
        </div>
      )}

      {/* Pam Tip */}
      <TripPlannerTip />

      {/* Suggestions */}
      <SuggestionsGrid suggestions={suggestions} />
    </TripPlannerLayout>
  );
}
