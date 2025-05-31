
import { Waypoint } from "./types";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";

interface WaypointsListProps {
  waypoints: Waypoint[];
  setWaypoints: (waypoints: Waypoint[]) => void;
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
}

export default function WaypointsList({
  waypoints,
  setWaypoints,
  directionsControl,
}: WaypointsListProps) {
  if (waypoints.length === 0) return null;

  return (
    <div>
      <h4 className="font-semibold">Stops:</h4>
      <ul className="space-y-1">
        {waypoints.map((w, i) => (
          <li key={i} className="flex items-center space-x-2">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center">
              {i + 1}
            </span>
            <span className="flex-1 text-sm">{w.name}</span>
            <button
              onClick={() => {
                directionsControl.current!.removeWaypoint(i);
                setWaypoints(waypoints.filter((_, idx) => idx !== i));
              }}
            >
              ❌
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
