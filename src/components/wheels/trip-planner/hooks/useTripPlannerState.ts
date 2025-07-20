import { useState, useEffect } from "react";
import { useCachedTripData } from "@/hooks/useCachedTripData";
import { useLockedPoints } from "./useLockedPoints";
import { Waypoint, Suggestion } from "../types";

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
  const [exclude, setExclude] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<string[]>(["duration", "distance"]);
  const [vehicle, setVehicle] = useState("car");
  const [routeType, setRouteType] = useState("fastest");
  const [manualMode, setManualMode] = useState(false);
  const [manualWaypoints, setManualWaypoints] = useState<Waypoint[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);

  // Load cached data on mount
  useEffect(() => {
    if (cachedTrip && !isOffline) {
      setOriginName(cachedTrip.originName || "");
      setDestName(cachedTrip.destName || "");
      setWaypoints(cachedTrip.waypoints || []);
      setSuggestions(cachedTrip.suggestions || []);
      setRouteProfile(cachedTrip.routeProfile || "driving");
      setMode(cachedTrip.mode || "driving");
    }
  }, [cachedTrip, isOffline]);

  // Manual waypoint functions
  const addManualWaypoint = (waypoint: Waypoint) => {
    setManualWaypoints(prev => [...prev, waypoint]);
  };

  const removeManualWaypoint = (index: number) => {
    setManualWaypoints(prev => prev.filter((_, i) => i !== index));
  };

  return {
    // Route state
    originName,
    setOriginName,
    destName,
    setDestName,
    waypoints,
    setWaypoints,
    suggestions,
    setSuggestions,
    
    // UI state
    adding,
    setAdding,
    
    // Travel options
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
    routeType,
    setRouteType,
    
    // Manual routing
    manualMode,
    setManualMode,
    manualWaypoints,
    addManualWaypoint,
    removeManualWaypoint,
    
    // Trip management
    tripId,
    setTripId,
    saveTripData,
    
    // Locked points
    ...lockedPointsState,
  };
}