
import { Button } from "@/components/ui/button";

interface TripControlsProps {
  mode: string;
  setMode: (mode: string) => void;
  adding: boolean;
  setAdding: (adding: boolean) => void;
  onSubmitTrip: () => void;
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  isOffline?: boolean;
  tripId?: string | null;
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
}: TripControlsProps) {
  return (
    <div className="space-y-3">
      {/* Route type selection moved to TravelModeButtons component */}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (isOffline) return;
            setAdding(true);
            if (map.current) map.current.getCanvas().style.cursor = "crosshair";
          }}
          className={`w-full ${adding ? "bg-gray-100" : ""}`}
          disabled={adding || isOffline}
          size="sm"
        >
          {adding ? "Click map…" : "Add Stop"}
        </Button>
        
        <Button
          onClick={onSubmitTrip}
          className={`w-full text-white ${
            isOffline 
              ? 'bg-yellow-600 hover:bg-yellow-700' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
          size="sm"
        >
          {isOffline ? "Queue for Pam" : "Send to Pam"}
        </Button>
        {tripId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const url = `${window.location.origin}/share/trip/${tripId}`;
              navigator.clipboard.writeText(url).catch(console.error);
            }}
          >
            Share Trip
          </Button>
        )}
      </div>
    </div>
  );
}
