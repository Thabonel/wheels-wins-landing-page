
import { Button } from "@/components/ui/button";
import { modes } from "./constants";

interface TripControlsProps {
  mode: string;
  setMode: (mode: string) => void;
  adding: boolean;
  setAdding: (adding: boolean) => void;
  onSubmitTrip: () => void;
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  isOffline?: boolean;
}

export default function TripControls({
  mode,
  setMode,
  adding,
  setAdding,
  onSubmitTrip,
  map,
  isOffline = false,
}: TripControlsProps) {
  return (
    <div className="space-y-3">
      {/* Mode Selection */}
      <select
        value={mode}
        onChange={(e) => !isOffline && setMode(e.target.value)}
        disabled={isOffline}
        className={`w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isOffline 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-white'
        }`}
      >
        {modes.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

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
      </div>
    </div>
  );
}
