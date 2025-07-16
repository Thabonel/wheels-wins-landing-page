
import { useState, useEffect } from "react";
import { useCachedTripData } from "@/hooks/useCachedTripData";
import { useLockedPoints } from "./useLockedPoints";
import { Waypoint, Suggestion } from "../types";

interface ManualWaypoint {
  id: string;
  latitude: number;
  longitude: number;
  order: number;
  isLocked: boolean;
}

export function useTripPlannerState(isOffline: boolean) {
  const { cachedTrip, saveTripData } = useCachedTripData();
  const lockedPointsState = useLockedPoints();
  
  // State management
  const [originName, setOriginName] = useState("");
  const [destName, setDestName] = useState("");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [adding, setAdding] = useState(false);
  const [travelMode, setTravelMode] = useState("driving");
  const [routeProfile, setRouteProfile] = useState("driving");
  const [mode, setMode] = useState("driving");
  const [tripId, setTripId] = useState<string | null>(null);
  const [exclude, setExclude] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState("car");
  
  // New routing state
  const [routeType, setRouteType] = useState("fastest");
  const [manualMode, setManualMode] = useState(false);
  const [manualWaypoints, setManualWaypoints] = useState<ManualWaypoint[]>([]);

  // Manual waypoint handlers
  const addManualWaypoint = (waypoint: ManualWaypoint) => {
    setManualWaypoints(prev => [...prev, waypoint]);
  };

  const removeManualWaypoint = (id: string) => {
    setManualWaypoints(prev => prev.filter(wp => wp.id !== id));
  };

  const clearManualWaypoints = () => {
    setManualWaypoints([]);
  };

  // Load cached data on mount
  useEffect(() => {
    if (cachedTrip && !isOffline) {
      setOriginName(cachedTrip.originName);
      setDestName(cachedTrip.destName);
      setWaypoints(cachedTrip.waypoints);
      setSuggestions(cachedTrip.suggestions);
      setRouteProfile(cachedTrip.routeProfile);
      setMode(cachedTrip.mode);
      setRouteType(cachedTrip.routeType || "fastest");
    }
  }, [cachedTrip, isOffline]);

  return {
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
    setRouteProfile,
    mode,
    setMode,
    exclude,
    setExclude,
    annotations,
    setAnnotations,
    vehicle,
    setVehicle,
    saveTripData,
    tripId,
    setTripId,
    // New routing state
    routeType,
    setRouteType,
    manualMode,
    setManualMode,
    manualWaypoints,
    setManualWaypoints,
    addManualWaypoint,
    removeManualWaypoint,
    clearManualWaypoints,
    ...lockedPointsState,
  };
}
