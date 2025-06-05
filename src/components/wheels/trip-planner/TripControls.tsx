
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
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <select
          value={mode}
          onChange={(e) => !isOffline && setMode(e.target.value)}
          disabled={isOffline}
          className={`border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => {
            if (isOffline) return;
            setAdding(true);
            if (map.current) map.current.getCanvas().style.cursor = "crosshair";
          }}
          className={adding ? "bg-gray-100" : ""}
          disabled={adding || isOffline}
        >
          {adding ? "Click map…" : "Add Stop"}
        </Button>
        
        <Button
          onClick={onSubmitTrip}
          className={`text-white ${
            isOffline 
              ? 'bg-yellow-600 hover:bg-yellow-700' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isOffline ? "Queue for Pam" : "Send to Pam"}
        </Button>
      </div>
    </div>
  );
}
