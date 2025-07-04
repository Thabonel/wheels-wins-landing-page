import { useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import TripPlannerControls from "./TripPlannerControls";
import TripPlannerHeader from "./TripPlannerHeader";
import OfflineTripBanner from "./OfflineTripBanner";
import WaypointsList from "./WaypointsList";
import SuggestionsGrid from "./SuggestionsGrid";
import LockedPointControls from "./LockedPointControls";
import MapControls from "./MapControls";
import { Itinerary } from "./types";
import { ItineraryService } from "./services/ItineraryService";
import { useIntegratedTripState } from "./hooks/useIntegratedTripState";
import { useTripPlannerHandlers } from "./hooks/useTripPlannerHandlers";
import { PAMProvider } from "./PAMContext";
import { useToast } from "@/hooks/use-toast";

interface IntegratedTripPlannerProps {
  isOffline?: boolean;
}

export default function IntegratedTripPlanner({ isOffline = false }: IntegratedTripPlannerProps) {
  const { toast } = useToast();
  const map = useRef<mapboxgl.Map>();
  const directionsControl = useRef<MapboxDirections>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);

  // Set Mapbox access token
  if (!isOffline && import.meta.env.VITE_MAPBOX_TOKEN) {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
  }

  // Use integrated state management
  const integratedState = useIntegratedTripState(isOffline);
  const handlers = useTripPlannerHandlers({
    directionsControl,
    originName: integratedState.route.originName,
    destName: integratedState.route.destName,
    waypoints: integratedState.route.waypoints,
    setSuggestions: integratedState.setSuggestions,
    saveTripData: integratedState.saveTripData,
    routeProfile: integratedState.travelMode,
    mode: integratedState.mode,
    tripId: null, // Add missing tripId property
    setTripId: () => {} // Add missing setTripId property
  });

  const generateItinerary = async () => {
    if (!integratedState.route.originName || !integratedState.route.destName) return;
    try {
      const itin = await ItineraryService.generate(
        integratedState.route.originName,
        integratedState.route.destName,
        Math.max(1, integratedState.route.waypoints.length + 1),
        ['sightseeing']
      );
      setItinerary(itin);
    } catch (err) {
      console.error('Itinerary generation failed', err);
      toast({ title: 'Itinerary Error', description: 'Could not generate itinerary', variant: 'destructive' });
    }
  };

  // Enhanced submit handler with PAM integration
  const handleSubmitTrip = async () => {
    try {
      if (integratedState.route.originName && integratedState.route.destName) {
        const budget = integratedState.budget?.totalBudget || 0;
        const message = `Optimize my trip from ${integratedState.route.originName} to ${integratedState.route.destName}. Budget: ${budget}. Consider social meetups and scenic routes.`;
        await integratedState.sendPAMRequest(message);
        await generateItinerary();

        toast({
          title: "Trip Optimization Started",
          description: "PAM is analyzing your route for the best recommendations.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send trip to PAM. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <PAMProvider>
      <div className="space-y-6">
        {/* Header */}
        <TripPlannerHeader isOffline={isOffline} />

        {/* Offline Banner */}
        {isOffline && <OfflineTripBanner />}

        {/* Trip Controls */}
        <TripPlannerControls
          directionsControl={directionsControl}
          originName={integratedState.route.originName}
          destName={integratedState.route.destName}
          setOriginName={integratedState.setOriginName}
          setDestName={integratedState.setDestName}
          travelMode={integratedState.travelMode}
          setTravelMode={integratedState.setTravelMode}
          mode={integratedState.mode}
          setMode={integratedState.setMode}
          adding={integratedState.adding}
          setAdding={integratedState.setAdding}
          onSubmitTrip={handleSubmitTrip}
          map={map}
          isOffline={isOffline}
          originLocked={integratedState.originLocked}
          destinationLocked={integratedState.destinationLocked}
          lockOrigin={integratedState.lockOrigin}
          lockDestination={integratedState.lockDestination}
        />

        {/* Locked Point Controls */}
        {(integratedState.originLocked || integratedState.destinationLocked) && (
          <LockedPointControls
            originLocked={integratedState.originLocked}
            destinationLocked={integratedState.destinationLocked}
            originName={integratedState.route.originName}
            destName={integratedState.route.destName}
            onUnlockOrigin={integratedState.unlockOrigin}
            onUnlockDestination={integratedState.unlockDestination}
          />
        )}

        {/* Map Container - Now using MapControls component */}
        {!isOffline ? (
          <MapControls
            region="US"
            waypoints={integratedState.route.waypoints}
            setWaypoints={integratedState.setWaypoints}
            adding={integratedState.adding}
            setAdding={integratedState.setAdding}
            setOriginName={integratedState.setOriginName}
            setDestName={integratedState.setDestName}
            onRouteChange={handlers.handleRouteChange || (() => {})}
            directionsControl={directionsControl}
            originName={integratedState.route.originName}
            destName={integratedState.route.destName}
            travelMode={integratedState.travelMode}
            onTravelModeChange={integratedState.setTravelMode}
            map={map}
            isOffline={isOffline}
            originLocked={integratedState.originLocked}
            destinationLocked={integratedState.destinationLocked}
            lockOrigin={integratedState.lockOrigin}
            lockDestination={integratedState.lockDestination}
          />
        ) : (
          <div className="h-[60vh] lg:h-[70vh] relative">
            <div className="overflow-hidden rounded-lg border h-full bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="h-full flex flex-col">
                {/* Offline Header */}
                <div className="bg-blue-100/50 border-b border-blue-200 p-4">
                  <h3 className="font-medium text-blue-900 flex items-center gap-2">
                    📍 Offline Trip Planner
                  </h3>
                </div>
                
                {/* Offline Content */}
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">
                      Plan Your Route
                    </h4>
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                      Use the route controls above to set your origin and destination. 
                      Your route will be calculated and displayed when online.
                    </p>
                    
                    {/* Current Route Display */}
                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                      <div className="text-xs font-medium text-gray-500 mb-2">
                        CURRENT ROUTE
                      </div>
                      <div className="text-sm font-medium text-gray-800">
                        {integratedState.route.originName && integratedState.route.destName 
                          ? `${integratedState.route.originName} → ${integratedState.route.destName}`
                          : 'No route set'}
                      </div>
                      {integratedState.route.waypoints.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {integratedState.route.waypoints.length} waypoints planned
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Waypoints List */}
        {integratedState.route.waypoints.length > 0 && (
          <WaypointsList
            waypoints={integratedState.route.waypoints}
            setWaypoints={integratedState.setWaypoints}
            directionsControl={directionsControl}
          />
        )}

        {/* Suggestions Grid */}
        {integratedState.route.suggestions.length > 0 && (
          <SuggestionsGrid
            suggestions={integratedState.route.suggestions}
          />
        )}

        {itinerary && (
          <div className="space-y-4">
            {itinerary.days.map(day => (
              <div key={day.day} className="border p-2 rounded-md">
                <h4 className="font-semibold">Day {day.day}</h4>
                <ul className="list-disc pl-5 text-sm">
                  {day.stops.map((stop, idx) => (
                    <li key={idx}>{stop.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </PAMProvider>
  );
}
