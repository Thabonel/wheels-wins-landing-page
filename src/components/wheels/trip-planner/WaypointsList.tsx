
import { Waypoint } from "./types";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";

interface WaypointsListProps {
  waypoints: Waypoint[];
  setWaypoints: (waypoints: Waypoint[]) => void;
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
  disabled?: boolean;
}

export default function WaypointsList({
  waypoints,
  setWaypoints,
  directionsControl,
  disabled = false,
}: WaypointsListProps) {
  if (waypoints.length === 0) return null;

  return (
    <div className={disabled ? 'opacity-60' : ''}>
      <h4 className="font-semibold">Stops:</h4>
      {disabled && (
        <p className="text-xs text-gray-500 mb-2">Stop editing disabled in offline mode</p>
      )}
      <ul className="space-y-1">
        {waypoints.map((w, i) => (
          <li key={i} className="flex items-center space-x-2">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center">
              {i + 1}
            </span>
            <span className="flex-1 text-sm">{w.name}</span>
            <button
              onClick={() => {
                if (disabled) return;
                directionsControl.current!.removeWaypoint(i);
                setWaypoints(waypoints.filter((_, idx) => idx !== i));
              }}
              disabled={disabled}
              className={disabled ? 'cursor-not-allowed opacity-50' : ''}
            >
              ❌
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
