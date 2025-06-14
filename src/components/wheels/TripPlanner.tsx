
import { useState, useRef, useEffect } from "react";
import { useRegion } from "@/context/RegionContext";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import MapControls from "./trip-planner/MapControls";
import GeocodeSearch from "./trip-planner/GeocodeSearch";
import RouteInputs from "./trip-planner/RouteInputs";
import TravelModeButtons from "./trip-planner/TravelModeButtons";
import TripControls from "./trip-planner/TripControls";
import WaypointsList from "./trip-planner/WaypointsList";
import SuggestionsGrid from "./trip-planner/SuggestionsGrid";
import OfflineTripBanner from "./trip-planner/OfflineTripBanner";
import { TripService } from "./trip-planner/TripService";
import { useCachedTripData } from "@/hooks/useCachedTripData";
import { Waypoint, Suggestion, TripPayload } from "./trip-planner/types";
import { toast } from "@/hooks/use-toast";

// Initialize Mapbox token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function TripPlanner() {
  const { region } = useRegion();
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const { cachedTrip, saveTripData } = useCachedTripData();
  
  // Map and directions refs
  const map = useRef<mapboxgl.Map>();
  const directionsControl = useRef<MapboxDirections>();
  
  // State management
  const [originName, setOriginName] = useState("");
  const [destName, setDestName] = useState("");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [adding, setAdding] = useState(false);
  const [travelMode, setTravelMode] = useState("driving");
  const [routeProfile, setRouteProfile] = useState("driving");
  const [mode, setMode] = useState("driving");

  // Load cached data on mount
  useEffect(() => {
    if (cachedTrip && !isOffline) {
      setOriginName(cachedTrip.originName);
      setDestName(cachedTrip.destName);
      setWaypoints(cachedTrip.waypoints);
      setSuggestions(cachedTrip.suggestions);
      setRouteProfile(cachedTrip.routeProfile);
      setMode(cachedTrip.mode);
    }
  }, [cachedTrip, isOffline]);

  const handleRouteChange = async () => {
    if (isOffline || !directionsControl.current) return;
    
    try {
      const origin = directionsControl.current.getOrigin();
      const destination = directionsControl.current.getDestination();
      
      if (origin && destination) {
        const originCoords = origin.geometry.coordinates as [number, number];
        const destCoords = destination.geometry.coordinates as [number, number];
        
        const fetchedSuggestions = await TripService.fetchTripSuggestions(
          { coordinates: originCoords, name: originName },
          { coordinates: destCoords, name: destName },
          waypoints,
          routeProfile,
          mode
        );
        
        setSuggestions(fetchedSuggestions);
        
        // Cache the trip data
        saveTripData(
          originName,
          destName,
          originCoords,
          destCoords,
          waypoints,
          fetchedSuggestions,
          routeProfile,
          mode
        );
      }
    } catch (error) {
      console.error("Error handling route change:", error);
      toast({
        title: "Route Error",
        description: "Failed to update route suggestions",
        variant: "destructive",
      });
    }
  };

  const handleSubmitTrip = async () => {
    if (!user || !directionsControl.current) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save your trip",
        variant: "destructive",
      });
      return;
    }

    try {
      const origin = directionsControl.current.getOrigin();
      const destination = directionsControl.current.getDestination();
      
      if (!origin || !destination) {
        toast({
          title: "Incomplete Route",
          description: "Please set both origin and destination",
          variant: "destructive",
        });
        return;
      }

      const payload: TripPayload = {
        user_id: user.id,
        origin: {
          name: originName,
          coords: origin.geometry.coordinates as [number, number],
        },
        destination: {
          name: destName,
          coords: destination.geometry.coordinates as [number, number],
        },
        stops: waypoints,
        routeMode: routeProfile,
        travelMode: mode,
      };

      if (isOffline) {
        // Store for later submission
        localStorage.setItem('pending-trip', JSON.stringify(payload));
        toast({
          title: "Trip Queued",
          description: "Your trip has been saved and will be sent to Pam when you're back online",
        });
      } else {
        await TripService.submitTripPlan(payload);
        toast({
          title: "Trip Sent to Pam",
          description: "Pam will analyze your route and provide personalized recommendations",
        });
      }
    } catch (error) {
      console.error("Error submitting trip:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to send trip to Pam",
        variant: "destructive",
      });
    }
  };

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
    <div className="space-y-6">
      {isOffline && <OfflineTripBanner />}
      
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
              onSubmitTrip={handleSubmitTrip}
              map={map}
              isOffline={isOffline}
            />
          </div>
        </div>
      </div>

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
      <div className="bg-purple-50 rounded-lg p-4 text-center">
        <p className="text-purple-700 font-medium">
          Ask Pam—Plan my trip from A to B
        </p>
        <p className="text-purple-600 text-sm mt-1">
          Set your destinations and Pam will suggest the best stops along your route
        </p>
      </div>

      {/* Suggestions */}
      <SuggestionsGrid suggestions={suggestions} />
    </div>
  );
}
