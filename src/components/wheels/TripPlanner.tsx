import 'mapbox-gl/dist/mapbox-gl.css';
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import { Card, CardContent } from "@/components/ui/card";
import { useRegion } from "@/context/RegionContext";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Corrected: [longitude, latitude]
const regionCenters: Record<string, [number, number]> = {
  Australia: [133.7751, -25.2744],
  US:       [-98.5795,  39.8283],
  Canada:  [-106.3468,  56.1304],
  NZ:      [174.8860, -40.9006],
  UK:      [-3.435973,  55.378051],
};

export default function TripPlanner() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const directionsControl = useRef<MapboxDirections | null>(null);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { region } = useRegion();

  async function fetchTripSuggestions() {
    const dir = directionsControl.current;
    if (!dir) return;
    const origin = dir.getOrigin()?.geometry.coordinates;
    const dest   = dir.getDestination()?.geometry.coordinates;
    const profile = dir.getProfile();
    if (!origin || !dest) return;

    setLoading(true);
    try {
      const payload = {
        region,
        travelStyle: profile,
        vehicleType: "4WD Camper",
        interests: ["parks", "fuel"],
        route: { origin, dest, profile },
      };
      const res = await fetch("/n8n/webhooks/trip-plan-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setSuggestions(json.suggestions || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mapContainer.current) return;
    const center = regionCenters[region] || regionCenters.US;
    if (map.current) {
      map.current.jumpTo({ center });
      return;
    }
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center,
      zoom: 3.5,
    });
    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.on("load", () => {
      map.current?.resize();
      const dir = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        unit: "metric",
        profile: "mapbox/driving",
        interactive: true,
        controls: { instructions: true },
      });
      directionsControl.current = dir;
      map.current!.addControl(dir, "top-left");
      dir.on("route", fetchTripSuggestions);
    });
  }, [region]);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    map.current.getStyle().layers?.forEach((layer) => {
      if (layer.id.startsWith("marker-")) {
        map.current!.removeLayer(layer.id);
        map.current!.removeSource(layer.id);
      }
    });
    const bounds = new mapboxgl.LngLatBounds();
    suggestions.forEach((item) => {
      new mapboxgl.Marker({ anchor: "bottom" })
        .setLngLat([item.lng, item.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<h3>${item.name}</h3><p>${item.tags?.join(", ") || ""}</p>`
          )
        )
        .addTo(map.current!);
      bounds.extend([item.lng, item.lat]);
    });
    if (suggestions.length) {
      map.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
      });
    }
  }, [suggestions]);

  return (
    <div className="space-y-6 w-full">
      {/* User Hint */}
      <p className="text-sm text-gray-500">
        Tip: You can also ask Pam directly in the chat panel—e.g., “Plan my trip from A to B.”
      </p>

      {/* Map */}
      <div
        ref={mapContainer}
        className="relative rounded-lg border h-[400px] w-full"
      />

      {loading && (
        <p className="text-center text-gray-600 mt-2">Planning your trip…</p>
      )}

      {suggestions.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Pam suggests:</h3>
          <div className="overflow-x-auto pb-4">
            <div className="flex space-x-4">
              {suggestions.map((item) => (
                <Card
                  key={item.name}
                  className="min-w-[280px] cursor-pointer hover:border-primary transition-colors"
                >
                  <CardContent className="p-4">
                    <h4 className="font-bold">{item.name}</h4>
                    <p className="text-gray-600 text-sm mt-1">
                      {item.tags?.join(", ") || item.type}
                    </p>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm mt-3 block hover:underline"
                    >
                      Visit Website
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
