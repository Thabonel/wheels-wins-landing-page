
import { Button } from "@/components/ui/button";
import { modes } from "./constants";

interface TripControlsProps {
  mode: string;
  setMode: (mode: string) => void;
  adding: boolean;
  setAdding: (adding: boolean) => void;
  onSubmitTrip: () => void;
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
}

export default function TripControls({
  mode,
  setMode,
  adding,
  setAdding,
  onSubmitTrip,
  map,
}: TripControlsProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            setAdding(true);
            if (map.current) map.current.getCanvas().style.cursor = "crosshair";
          }}
          className={adding ? "bg-gray-100" : ""}
          disabled={adding}
        >
          {adding ? "Click map…" : "Add Stop"}
        </Button>
        
        <Button
          onClick={onSubmitTrip}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Send to Pam
        </Button>
      </div>
    </div>
  );
}
