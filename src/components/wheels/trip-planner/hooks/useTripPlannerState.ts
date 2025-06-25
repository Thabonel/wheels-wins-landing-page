
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
    saveTripData,
    ...lockedPointsState,
  };
}
