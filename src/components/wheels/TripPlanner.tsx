import 'mapbox-gl/dist/mapbox-gl.css';
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import { useRegion } from "@/context/RegionContext";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { useCachedTripData } from "@/hooks/useCachedTripData";
import { hideGeocoderIcon } from "./trip-planner/utils";
import { modes } from "./trip-planner/constants";
import { Waypoint, Suggestion } from "./trip-planner/types";
import MapControls from "./trip-planner/MapControls";
import GeocodeSearch from "./trip-planner/GeocodeSearch";
import TravelModeButtons from "./trip-planner/TravelModeButtons";
import TripControls from "./trip-planner/TripControls";
import WaypointsList from "./trip-planner/WaypointsList";
import SuggestionsGrid from "./trip-planner/SuggestionsGrid";
import DirectionsControl from "./trip-planner/DirectionsControl";
import OfflineTripBanner from "./trip-planner/OfflineTripBanner";
import { TripService } from "./trip-planner/TripService";
import { MapPin } from "lucide-react";
import PamAssistant from "@/components/PamAssistant";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const { isOffline, addToQueue } = useOffline();
  const { cachedTrip, saveTripData } = useCachedTripData();
  const isMobile = useIsMobile();

  // Hide default geocoder icon
  useEffect(() => {
    return hideGeocoderIcon();
  }, []);

  // Cleanup map sources on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 TripPlanner: Cleaning up map resources');
      
      // Clean up directions control
      if (directionsControl.current && map.current) {
        try {
          // Remove directions control from map
          map.current.removeControl(directionsControl.current);
          
          // Clean up map sources that might cause conflicts
          const mapInstance = map.current;
          
          // Check and remove directions source if it exists
          if (mapInstance.getSource('directions')) {
            mapInstance.removeSource('directions');
          }
          
          // Check and remove other common sources that might conflict
          const sourcesToClean = ['directions', 'mapbox-directions-origin', 'mapbox-directions-destination', 'mapbox-directions-route'];
          sourcesToClean.forEach(sourceId => {
            if (mapInstance.getSource(sourceId)) {
              try {
                mapInstance.removeSource(sourceId);
              } catch (error) {
                console.warn(`Failed to remove source ${sourceId}:`, error);
              }
            }
          });
          
        } catch (error) {
          console.warn('Error cleaning up directions control:', error);
        }
      }
      
      // Clean up map instance
      if (map.current) {
        try {
          map.current.remove();
        } catch (error) {
          console.warn('Error removing map:', error);
        }
      }
    };
  }, []);

  // Load cached trip data when offline
  useEffect(() => {
    if (isOffline && cachedTrip) {
      setOriginName(cachedTrip.originName);
      setDestName(cachedTrip.destName);
      setWaypoints(cachedTrip.waypoints);
      setSuggestions(cachedTrip.suggestions);
      setMode(cachedTrip.mode);
    }
  }, [isOffline, cachedTrip]);

  const submitTripPlan = async () => {
    if (isOffline) {
      // Queue the action for when back online
      const dir = directionsControl.current!;
      const originCoords = dir.getOrigin()?.geometry.coordinates as [number, number] | undefined;
      const destCoords = dir.getDestination()?.geometry.coordinates as [number, number] | undefined;
      if (!user || !originCoords || !destCoords) return;
      
      addToQueue('log_trip', {
        user_id: user.id,
        origin: { name: originName, coords: originCoords },
        destination: { name: destName, coords: destCoords },
        stops: waypoints,
        routeMode: dir.getProfile(),
        travelMode: mode,
      });
      return;
    }

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
    if (isOffline) {
      // Don't fetch when offline, use cached data
      return;
    }

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
      
      // Cache the trip data
      saveTripData(
        originName,
        destName,
        origin,
        dest,
        waypoints,
        suggestions,
        dir.getProfile(),
        mode
      );
      
      await saveTrip();
      await submitTripPlan();
    } finally {
      setLoading(false);
    }
  };

  const saveTrip = async () => {
    if (isOffline) {
      // Queue the save action for when back online
      const dir = directionsControl.current!;
      const origin = dir.getOrigin()?.geometry.coordinates as [number, number] | undefined;
      const dest = dir.getDestination()?.geometry.coordinates as [number, number] | undefined;
      if (!user || !origin || !dest) return;
      
      addToQueue('update_storage', {
        userId: user.id,
        originName,
        destName,
        origin,
        dest,
        routingProfile: dir.getProfile(),
        suggestions,
        mode,
        waypoints
      });
      return;
    }

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
    <div className="w-full h-full">
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen">
        {/* Left side - Map and controls */}
        <div className="flex-1 flex flex-col">
          {/* Show offline banner when offline */}
          {isOffline && (
            <div className="p-4 pb-2">
              <OfflineTripBanner />
            </div>
          )}

          <p className="text-sm text-gray-500 p-4 pb-2">
            Tip: Ask Pam—"Plan my trip from {originName} to {destName}."
          </p>

          {/* Map Container */}
          <div className="flex-1 px-4">
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
              isOffline={isOffline}
            />
          </div>

          {/* Controls below map */}
          <div className="p-4 space-y-4">
            {/* Search Bar */}
            <GeocodeSearch directionsControl={directionsControl} disabled={isOffline} />

            {/* Route Planning Controls */}
            <div className="flex gap-4">
              {/* Left side - Trip controls */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <TripControls
                    mode={mode}
                    setMode={setMode}
                    adding={adding}
                    setAdding={setAdding}
                    onSubmitTrip={submitTripPlan}
                    map={map}
                    isOffline={isOffline}
                  />
                </div>
              </div>

              {/* Right side - Route Points and Travel Modes */}
              <div className="w-96 space-y-4">
                {/* Directions Control */}
                <DirectionsControl 
                  directionsControl={directionsControl}
                  map={map}
                  disabled={isOffline}
                />

                {/* Travel Mode Buttons */}
                <div className="bg-white rounded-lg border p-4">
                  <div className="grid grid-cols-4 gap-2">
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
                          onClick={() => !isOffline && setTravelMode(mode.id)}
                          disabled={isOffline}
                          className={`px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-600'
                              : isOffline
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
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
            </div>

            {/* Waypoints List */}
            <WaypointsList
              waypoints={waypoints}
              setWaypoints={setWaypoints}
              directionsControl={directionsControl}
              disabled={isOffline}
            />

            {/* Loading/Saving States */}
            {loading && <p className="text-center text-gray-600">Planning…</p>}
            {saving && <p className="text-center text-gray-600">Saving…</p>}
            
            {/* Suggestions Grid */}
            <SuggestionsGrid suggestions={suggestions} />
          </div>
        </div>

        {/* Right side - Pam Assistant */}
        <div className="w-96 border-l bg-white">
          <PamAssistant />
        </div>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className="lg:hidden space-y-6 w-full">
        {/* Show offline banner when offline */}
        {isOffline && <OfflineTripBanner />}

        <p className="text-sm text-gray-500">
          Tip: Ask Pam—"Plan my trip from {originName} to {destName}."
        </p>

        {/* Full Width Map */}
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
          isOffline={isOffline}
        />

        {/* Search Bar */}
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Search for places to add to your route:
          </p>
          <GeocodeSearch directionsControl={directionsControl} disabled={isOffline} />
        </div>

        {/* Mobile Directions Control */}
        <DirectionsControl 
          directionsControl={directionsControl}
          map={map}
          disabled={isOffline}
        />

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
                  onClick={() => !isOffline && setTravelMode(mode.id)}
                  disabled={isOffline}
                  className={`px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : isOffline
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
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
          isOffline={isOffline}
        />

        {/* Waypoints List */}
        <WaypointsList
          waypoints={waypoints}
          setWaypoints={setWaypoints}
          directionsControl={directionsControl}
          disabled={isOffline}
        />

        {/* Loading/Saving States */}
        {loading && <p className="text-center text-gray-600">Planning…</p>}
        {saving && <p className="text-center text-gray-600">Saving…</p>}
        
        {/* Suggestions Grid */}
        <SuggestionsGrid suggestions={suggestions} />
      </div>
    </div>
  );
}