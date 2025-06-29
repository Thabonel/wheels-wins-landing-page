
import { useRef, useState } from "react";
import { useRegion } from "@/context/RegionContext";
import { useOffline } from "@/context/OfflineContext";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import { getMapboxToken } from "@/utils/mapboxToken";
import MapControls from "./trip-planner/MapControls";
import GeocodeSearch from "./trip-planner/GeocodeSearch";
import WaypointsList from "./trip-planner/WaypointsList";
import SuggestionsGrid from "./trip-planner/SuggestionsGrid";
import TripPlannerHeader from "./trip-planner/TripPlannerHeader";
import TripPlannerControls from "./trip-planner/TripPlannerControls";
import TripPlannerTip from "./trip-planner/TripPlannerTip";
import TripPlannerLayout from "./trip-planner/TripPlannerLayout";
import LockedPointControls from "./trip-planner/LockedPointControls";
import WeatherWidget from "./WeatherWidget";
import BudgetSidebar from "./trip-planner/BudgetSidebar";
import { useTripPlannerState } from "./trip-planner/hooks/useTripPlannerState";
import { useTripPlannerHandlers } from "./trip-planner/hooks/useTripPlannerHandlers";
import { Button } from "@/components/ui/button";
import { Cloud, DollarSign } from "lucide-react";

// Initialize Mapbox token
const mapboxToken = getMapboxToken();
mapboxgl.accessToken = mapboxToken || '';

export default function TripPlanner() {
  const { region } = useRegion();
  const { isOffline } = useOffline();
  const [showWeather, setShowWeather] = useState(false);
  const [weatherLocation, setWeatherLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showBudget, setShowBudget] = useState(false);
  
  // Map and directions refs
  const map = useRef<mapboxgl.Map>();
  const directionsControl = useRef<MapboxDirections>();
  
  // State management with locked points
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
    originLocked,
    destinationLocked,
    lockOrigin,
    lockDestination,
    unlockOrigin,
    unlockDestination,
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

  // Get weather for route destination
  const handleGetWeather = () => {
    if (directionsControl.current) {
      const destination = directionsControl.current.getDestination();
      if (destination && destination.geometry) {
        const [lng, lat] = destination.geometry.coordinates;
        setWeatherLocation({ lat, lng });
        setShowWeather(true);
      }
    }
  };

  if (!mapboxToken) {
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
    <TripPlannerLayout 
      showSidebar={showBudget}
      sidebar={
        <BudgetSidebar
          directionsControl={directionsControl}
          isVisible={showBudget}
          onClose={() => setShowBudget(false)}
          waypoints={waypoints}
        />
      }
    >
      <TripPlannerHeader isOffline={isOffline} />
      
      {/* Locked Points Controls */}
      <LockedPointControls
        originLocked={originLocked}
        destinationLocked={destinationLocked}
        originName={originName}
        destName={destName}
        onUnlockOrigin={unlockOrigin}
        onUnlockDestination={unlockDestination}
        disabled={isOffline}
      />
      
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
          originLocked={originLocked}
          destinationLocked={destinationLocked}
          lockOrigin={lockOrigin}
          lockDestination={lockDestination}
        />
        
        {/* Widget Toggles */}
        {destName && !isOffline && (
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGetWeather}
              className="bg-white/90 backdrop-blur-sm"
            >
              <Cloud className="w-4 h-4 mr-2" />
              Weather
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBudget(!showBudget)}
              className="bg-white/90 backdrop-blur-sm"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Budget
            </Button>
          </div>
        )}
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
        originLocked={originLocked}
        destinationLocked={destinationLocked}
        lockOrigin={lockOrigin}
        lockDestination={lockDestination}
      />

      {/* Weather Widget Sidebar */}
      {showWeather && weatherLocation && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Route Weather</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWeather(false)}
            >
              Close
            </Button>
          </div>
          <WeatherWidget
            latitude={weatherLocation.lat}
            longitude={weatherLocation.lng}
          />
        </div>
      )}

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
