import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ExternalLink } from "lucide-react";
import { usePAMContext } from "./PAMContext";
import GeocodeSearch from "./GeocodeSearch";
import NavigationExportHub from "./NavigationExportHub";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
interface TripControlsProps {
  mode: string;
  setMode: (mode: string) => void;
  adding: boolean;
  setAdding: (adding: boolean) => void;
  onSubmitTrip: () => void;
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  isOffline?: boolean;
  tripId?: string | null;
  // Route data for PAM integration
  originName?: string;
  destName?: string;
  waypoints?: Array<{
    name: string;
    coords: [number, number];
  }>;
  routeType?: string;
  vehicle?: string;
  // Directions control for GeocodeSearch
  directionsControl?: React.MutableRefObject<MapboxDirections | undefined>;
  originLocked?: boolean;
  destinationLocked?: boolean;
}
export default function TripControls({
  mode,
  setMode,
  adding,
  setAdding,
  onSubmitTrip,
  map,
  isOffline = false,
  tripId,
  originName = "",
  destName = "",
  waypoints = [],
  routeType = "fastest",
  vehicle = "car",
  directionsControl,
  originLocked = false,
  destinationLocked = false
}: TripControlsProps) {
  const {
    sendMessage,
    updateContext
  } = usePAMContext();
  const [showSearch, setShowSearch] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const handleSendToPam = async () => {
    try {
      // Update PAM context with current trip data
      updateContext({
        currentTrip: {
          origin: originName,
          destination: destName,
          waypoints: waypoints.map(wp => wp.name),
          budget: 1500,
          // Default budget, should come from props in real implementation
          dates: {
            start: "",
            end: ""
          } // Should come from trip planner state
        }
      });

      // Format route data for PAM
      const routeData = {
        origin: originName,
        destination: destName,
        waypoints: waypoints,
        routeType: routeType,
        vehicle: vehicle,
        totalStops: waypoints.length + 2 // origin + destination + waypoints
      };

      // Create the trip description with route improvement focus
      const tripDescription = `I've planned this route and would like you to help improve it:

📍 From: ${originName}
🎯 To: ${destName}
${waypoints.length > 0 ? `🛑 Stops: ${waypoints.map(wp => wp.name).join(', ')}` : ''}
🚗 Vehicle: ${vehicle}
⚡ Route preference: ${routeType}

Please analyze this route and suggest improvements such as:
- More scenic or interesting alternative paths
- Notable attractions or points of interest along the way
- Better rest stops or dining options
- Optimal timing recommendations
- Any potential road conditions or traffic considerations

Help me make this journey more enjoyable and efficient!`;

      // Send to PAM chat
      await sendMessage(tripDescription);

      // Call original submit handler if not offline
      if (!isOffline) {
        onSubmitTrip();
      }
    } catch (error) {
      console.error('Failed to send trip to PAM:', error);
      // Fallback to original submit handler
      onSubmitTrip();
    }
  };
  const handleAddStop = () => {
    if (isOffline) return;

    // If we have both origin and destination, show search interface
    if (originName && destName) {
      setShowSearch(true);
    } else {
      // Otherwise, enable map click mode
      setAdding(true);
      if (map.current) map.current.getCanvas().style.cursor = "crosshair";
    }
  };
  const handleSearchClose = () => {
    setShowSearch(false);
  };
  const handleSendTo = () => {
    if (!originName || !destName) return;
    setShowExportModal(true);
  };
  const handleExportClose = () => {
    setShowExportModal(false);
  };

  // Format current route data for NavigationExportHub
  const currentRoute = {
    origin: {
      name: originName,
      lat: 0,
      // Coordinates will be handled by the export component
      lng: 0
    },
    destination: {
      name: destName,
      lat: 0,
      lng: 0
    },
    waypoints: waypoints.map(wp => ({
      name: wp.name,
      lat: wp.coords[1] || 0,
      lng: wp.coords[0] || 0
    })),
    originName,
    destName
  };
  return <div className="space-y-3">
      {/* Add Stop Search Interface */}
      {showSearch && <Card className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Add Stop to Route</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleSearchClose} className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <p className="text-xs text-gray-600">
                Search for a place to add between {originName} and {destName}
              </p>
              {directionsControl && <GeocodeSearch directionsControl={directionsControl} disabled={isOffline} originLocked={originLocked} destinationLocked={destinationLocked} onWaypointAdded={handleSearchClose} />}
            </div>
          </CardContent>
        </Card>}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <Button 
          onClick={handleSendToPam} 
          className={`w-full text-white ${isOffline ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`} 
          size="sm" 
          disabled={!originName || !destName}
        >
          {isOffline ? "Queue for Pam" : "Ask Pam to Improve Route"}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handleSendTo} 
          className="w-full" 
          size="sm" 
          disabled={!originName || !destName || isOffline}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Export to Navigation Apps
        </Button>
        {tripId && <Button variant="outline" size="sm" onClick={() => {
        const url = `${window.location.origin}/share/trip/${tripId}`;
        navigator.clipboard.writeText(url).catch(console.error);
      }}>
            Share Trip
          </Button>}
      </div>

      {/* Navigation Export Modal */}
      <NavigationExportHub isOpen={showExportModal} onClose={handleExportClose} currentRoute={currentRoute} />
    </div>;
}