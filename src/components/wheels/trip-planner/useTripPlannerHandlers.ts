import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { TripService } from "../TripService";
import { TripPayload, Waypoint, Suggestion } from "../types";
import { toast } from "@/hooks/use-toast";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";

interface UseTripPlannerHandlersProps {
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
  originName: string;
  destName: string;
  waypoints: Waypoint[];
  setSuggestions: (suggestions: Suggestion[]) => void;
  saveTripData: (
    originName: string,
    destName: string,
    origin: [number, number],
    destination: [number, number],
    waypoints: Waypoint[],
    suggestions: Suggestion[],
    routeProfile: string,
    mode: string
  ) => void;
  routeProfile: string;
  mode: string;
  tripId: string | null;
  setTripId: (id: string) => void;
}

export function useTripPlannerHandlers({
  directionsControl,
  originName,
  destName,
  waypoints,
  setSuggestions,
  saveTripData,
  routeProfile,
  mode,
  tripId,
  setTripId,
}: UseTripPlannerHandlersProps) {
  const { user } = useAuth();
  const { isOffline } = useOffline();

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

        if (tripId) {
          await TripService.updateTripRoute(
            tripId,
            originCoords,
            destCoords,
            routeProfile,
            fetchedSuggestions,
            mode,
            waypoints
          );
        }
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
        if (!tripId) {
          const newId = await TripService.saveTrip(
            user.id,
            originName,
            destName,
            origin.geometry.coordinates as [number, number],
            destination.geometry.coordinates as [number, number],
            routeProfile,
            [],
            mode,
            waypoints
          );
          if (newId) setTripId(newId);
        }
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

  return {
    handleRouteChange,
    handleSubmitTrip,
  };
}