import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import TripPlannerLayout from "./TripPlannerLayout";
import TripPlannerControls from "./TripPlannerControls";
import TripPlannerHeader from "./TripPlannerHeader";
import BudgetSidebar from "./BudgetSidebar";
import OfflineTripBanner from "./OfflineTripBanner";
import WaypointsList from "./WaypointsList";
import SuggestionsGrid from "./SuggestionsGrid";
import LockedPointControls from "./LockedPointControls";
import MapControls from "./MapControls";
import { useIntegratedTripState } from "./hooks/useIntegratedTripState";
import { useTripPlannerHandlers } from "./hooks/useTripPlannerHandlers";
import { PAMProvider } from "./PAMContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Users, DollarSign } from "lucide-react";

interface IntegratedTripPlannerProps {
  isOffline?: boolean;
}

export default function IntegratedTripPlanner({ isOffline = false }: IntegratedTripPlannerProps) {
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>();
  const directionsControl = useRef<MapboxDirections>();
  const [mapLoaded, setMapLoaded] = useState(false);

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
    mode: integratedState.mode
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTRmb3M5NjMwYWVlMnFxdjJ4cWh6YjE5In0.c8pPQy_8HhKbO6_hJ2C9zw";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-98.5795, 39.8283],
      zoom: 4,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }));

    map.current.on("load", () => {
      setMapLoaded(true);
      
      // Initialize directions
      directionsControl.current = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        unit: "imperial",
        profile: "mapbox/driving",
        interactive: false,
        controls: { instructions: false, profileSwitcher: false },
      });

      if (map.current && directionsControl.current) {
        map.current.addControl(directionsControl.current, "top-left");
        
        // Set up event listeners
        directionsControl.current.on("route", handlers.handleRouteChange);
        directionsControl.current.on("clear", () => console.log('Route cleared'));
        map.current.on("click", (e) => console.log('Map clicked:', e.lngLat));
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [handlers.handleRouteChange]);

  // Enhanced submit handler with PAM integration
  const handleSubmitTrip = async () => {
    try {
      if (integratedState.route.originName && integratedState.route.destName) {
        const message = `Optimize my trip from ${integratedState.route.originName} to ${integratedState.route.destName}. Budget: $${integratedState.budget.totalBudget}. Consider social meetups and scenic routes.`;
        await integratedState.sendPAMRequest(message);
        
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
      <div className="min-h-screen bg-background">
        {/* Header */}
        <TripPlannerHeader isOffline={isOffline} />

        {/* Offline Banner */}
        {isOffline && <OfflineTripBanner />}

        <TripPlannerLayout
          integratedState={{
            ...integratedState,
            toggleFeature: integratedState.toggleFeature,
          }}
          sidebar={<BudgetSidebar isVisible={true} onClose={() => {}} />}
          showSidebar={integratedState.ui.showBudgetSidebar}
        >
          <div className="space-y-6">
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

            {/* Map Container */}
            <div className="relative">
              <div
                ref={mapContainer}
                className="h-[600px] w-full rounded-lg border shadow-sm"
              />
              
              {/* Map Controls Overlay - Simplified */}
              {mapLoaded && (
                <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => integratedState.toggleFeature('social')}
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => integratedState.toggleFeature('budget')}
                    >
                      <DollarSign className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Waypoints List */}
            {integratedState.route.waypoints.length > 0 && (
              <WaypointsList
                waypoints={integratedState.route.waypoints}
                setWaypoints={() => {}}
                directionsControl={directionsControl}
              />
            )}

            {/* Suggestions Grid */}
            {integratedState.route.suggestions.length > 0 && (
              <SuggestionsGrid
                suggestions={integratedState.route.suggestions}
              />
            )}
          </div>
        </TripPlannerLayout>
      </div>
    </PAMProvider>
  );
}