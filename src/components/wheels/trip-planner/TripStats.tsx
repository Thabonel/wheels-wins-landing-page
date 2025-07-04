import { useEffect, useState } from "react";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import { useUserUnits } from "./hooks/useUserUnits";

interface TripStatsProps {
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
}

const MPG = 8.5; // default mpg for fuel estimate
const KM_PER_MILE = 1.60934;
const L_PER_GALLON = 3.78541;

export default function TripStats({ directionsControl }: TripStatsProps) {
  const { units } = useUserUnits();
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fuel, setFuel] = useState(0);

  useEffect(() => {
    if (!directionsControl?.current) return;
    const dir = directionsControl.current;

    const updateStats = () => {
      try {
        const route = (dir as any).getRoute?.();
        if (route && route[0] && route[0].legs) {
          const totalDistance = route[0].legs.reduce(
            (sum: number, leg: any) => sum + (leg.distance || 0),
            0,
          );
          const totalDuration = route[0].legs.reduce(
            (sum: number, leg: any) => sum + (leg.duration || 0),
            0,
          );
          const distKm = totalDistance / 1000;
          const distMiles = distKm / KM_PER_MILE;

          setDistance(units === "imperial" ? distMiles : distKm);
          setDuration(totalDuration / 3600);

          const gallons = distMiles / MPG;
          const liters = gallons * L_PER_GALLON;
          setFuel(units === "imperial" ? gallons : liters);
        }
      } catch (err) {
        console.warn("Error computing trip stats", err);
      }
    };

    dir.on("route", updateStats);
    updateStats();
    return () => {
      dir.off("route", updateStats);
    };
  }, [directionsControl, units]);

  if (!directionsControl?.current) return null;

  return (
    <div className="bg-white rounded-lg border p-4">
      <h4 className="font-semibold mb-2">Trip Stats</h4>
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="font-medium">Distance:</span> {distance.toFixed(1)}{" "}
          {units === "imperial" ? "mi" : "km"}
        </div>
        <div>
          <span className="font-medium">Duration:</span> {duration.toFixed(1)}{" "}
          hrs
        </div>
        <div>
          <span className="font-medium">Fuel:</span> {fuel.toFixed(1)}{" "}
          {units === "imperial" ? "gal" : "L"}
        </div>
      </div>
    </div>
  );
}
