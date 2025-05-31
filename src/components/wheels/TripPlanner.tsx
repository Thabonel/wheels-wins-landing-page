
import 'mapbox-gl/dist/mapbox-gl.css';
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import { useRegion } from "@/context/RegionContext";
import { useAuth } from "@/context/AuthContext";
import { hideGeocoderIcon } from "./trip-planner/utils";
import { modes } from "./trip-planner/constants";
import { Waypoint, Suggestion } from "./trip-planner/types";
import MapControls from "./trip-planner/MapControls";
import TripControls from "./trip-planner/TripControls";
import WaypointsList from "./trip-planner/WaypointsList";
import SuggestionsGrid from "./trip-planner/SuggestionsGrid";
import { TripService } from "./trip-planner/TripService";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function TripPlanner() {
  const directionsControl = useRef<MapboxDirections>();
  const map = useRef<mapboxgl.Map>();
  const [originName, setOriginName] = useState("A");
  const [destName, setDestName] = useState("B");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState(modes[0].value);
  const { region } = useRegion();
  const { user } = useAuth();

  // Hide default geocoder icon
  useEffect(() => {
    return hideGeocoderIcon();
  }, []);

  const submitTripPlan = async () => {
    const dir = directionsControl.current!;
    const originCoords = dir.getOrigin()?.geometry.coordinates as [number, number] | undefined;
    const destCoords = dir.getDestination()?.geometry.coordinates as [number, number] | undefined;
    if (!user || !originCoords || !destCoords) return;
    
    const payload = {
      user_id: user.id,
      origin: { name: originName, coords: originCoords },
      destination: { name: destName, coords: destCoords },
      stops: waypoints,
      routeMode: dir.getProfile(),
      travelMode: mode,
    };
    
    await TripService.submitTripPlan(payload);
  };

  const fetchTripSuggestions = async () => {
    const dir = directionsControl.current!;
    const origin = dir.getOrigin()?.geometry.coordinates as [number, number] | undefined;
    const dest = dir.getDestination()?.geometry.coordinates as [number, number] | undefined;
    if (!origin || !dest) return;
    
    setLoading(true);
    try {
      const suggestions = await TripService.fetchTripSuggestions(
        { coordinates: origin, name: originName },
        { coordinates: dest, name: destName },
        waypoints,
        dir.getProfile(),
        mode
      );
      setSuggestions(suggestions);
      await saveTrip();
      await submitTripPlan();
    } finally {
      setLoading(false);
    }
  };

  const saveTrip = async () => {
    const dir = directionsControl.current!;
    const origin = dir.getOrigin()?.geometry.coordinates as [number, number] | undefined;
    const dest = dir.getDestination()?.geometry.coordinates as [number, number] | undefined;
    if (!user || !origin || !dest) return;
    
    setSaving(true);
    await TripService.saveTrip(
      user.id,
      originName,
      destName,
      origin,
      dest,
      dir.getProfile(),
      suggestions,
      mode,
      waypoints
    );
    setSaving(false);
  };

  return (
    <div className="space-y-4 w-full">
      <p className="text-sm text-gray-500">
        Tip: Ask Pam—"Plan my trip from {originName} to {destName}."
      </p>

      <MapControls
        region={region}
        waypoints={waypoints}
        setWaypoints={setWaypoints}
        adding={adding}
        setAdding={setAdding}
        setOriginName={setOriginName}
        setDestName={setDestName}
        onRouteChange={fetchTripSuggestions}
        directionsControl={directionsControl}
      />

      <TripControls
        mode={mode}
        setMode={setMode}
        adding={adding}
        setAdding={setAdding}
        onSubmitTrip={submitTripPlan}
        map={map}
      />

      <p className="text-sm text-gray-500">
        Use the search box below to find and add additional stops by name or address.
      </p>

      <WaypointsList
        waypoints={waypoints}
        setWaypoints={setWaypoints}
        directionsControl={directionsControl}
      />

      {loading && <p className="text-center text-gray-600">Planning…</p>}
      {saving && <p className="text-center text-gray-600">Saving…</p>}
      
      <SuggestionsGrid suggestions={suggestions} />
    </div>
  );
}
