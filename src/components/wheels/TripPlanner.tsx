
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
import GeocodeSearch from "./trip-planner/GeocodeSearch";
import RouteInputs from "./trip-planner/RouteInputs";
import TravelModeButtons from "./trip-planner/TravelModeButtons";
import TripControls from "./trip-planner/TripControls";
import WaypointsList from "./trip-planner/WaypointsList";
import SuggestionsGrid from "./trip-planner/SuggestionsGrid";
import { TripService } from "./trip-planner/TripService";
import { MapPin } from "lucide-react";

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
  const [travelMode, setTravelMode] = useState('driving');
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
    <div className="space-y-6 w-full">
      <p className="text-sm text-gray-500">
        Tip: Ask Pam—"Plan my trip from {originName} to {destName}."
      </p>

      {/* Full Width Map with Overlays */}
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
        originName={originName}
        destName={destName}
        travelMode={travelMode}
        onTravelModeChange={setTravelMode}
        map={map}
      />

      {/* Search Bar */}
      <div className="space-y-2">
        <p className="text-sm text-gray-500">
          Search for places to add to your route:
        </p>
        <GeocodeSearch directionsControl={directionsControl} />
      </div>

      {/* Mobile Route Inputs (Below map on small screens) */}
      <div className="lg:hidden space-y-4">
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Route Points</h3>
          
          {/* Origin Input */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
              A
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={originName}
                onChange={(e) => setOriginName(e.target.value)}
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
                value={destName}
                onChange={(e) => setDestName(e.target.value)}
                placeholder="Choose destination"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Mobile Travel Mode Buttons */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Travel Mode</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'traffic', label: 'Traffic' },
              { id: 'driving', label: 'Driving' },
              { id: 'walking', label: 'Walking' },
              { id: 'cycling', label: 'Cycling' },
            ].map((mode) => {
              const isActive = travelMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setTravelMode(mode.id)}
                  className={`px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trip Controls */}
      <TripControls
        mode={mode}
        setMode={setMode}
        adding={adding}
        setAdding={setAdding}
        onSubmitTrip={submitTripPlan}
        map={map}
      />

      {/* Waypoints List */}
      <WaypointsList
        waypoints={waypoints}
        setWaypoints={setWaypoints}
        directionsControl={directionsControl}
      />

      {/* Loading/Saving States */}
      {loading && <p className="text-center text-gray-600">Planning…</p>}
      {saving && <p className="text-center text-gray-600">Saving…</p>}
      
      {/* Suggestions Grid */}
      <SuggestionsGrid suggestions={suggestions} />
    </div>
  );
}
