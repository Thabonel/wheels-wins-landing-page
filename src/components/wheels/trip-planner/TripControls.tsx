
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
    <div className="flex items-center space-x-4 flex-wrap">
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {modes.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          setAdding(true);
          if (map.current) map.current.getCanvas().style.cursor = "crosshair";
        }}
        className={`px-4 py-2 text-white rounded ${
          adding ? "bg-gray-500" : "bg-primary"
        } hover:opacity-90 transition-opacity`}
      >
        {adding ? "Click map…" : "Add Stop"}
      </button>
      <button
        onClick={onSubmitTrip}
        className="px-4 py-2 text-white bg-green-600 hover:opacity-90 rounded transition-opacity"
      >
        Send to Pam
      </button>
    </div>
  );
}
