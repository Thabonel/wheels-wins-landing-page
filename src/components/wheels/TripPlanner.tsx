import 'mapbox-gl/dist/mapbox-gl.css';
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import { Card, CardContent } from "@/components/ui/card";
import { useRegion } from "@/context/RegionContext";
import { supabase } from "@/integrations/supabase";
import { useAuth } from "@/context/AuthContext";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface Waypoint {
  coords: [number, number];
  name: string;
}

const regionCenters: Record<string, [number, number]> = {
  Australia: [133.7751, -25.2744],
  US: [-98.5795, 39.8283],
  Canada: [-106.3468, 56.1304],
  NZ: [174.8860, -40.9006],
  UK: [-3.435973, 55.378051],
};

const modes = [
  { label: "Off-grid", value: "off-grid" },
  { label: "Luxury", value: "luxury" },
  { label: "Fastest (routing)", value: "fastest" },
  { label: "Shortest (routing)", value: "shortest" },
  { label: "Scenic (routing)", value: "scenic" },
];

export default function TripPlanner() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const geocoderContainer = useRef<HTMLDivElement>(null);
  const directionsContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>();
  const directionsControl = useRef<MapboxDirections>();
  const [originName, setOriginName] = useState("A");
  const [destName, setDestName] = useState("B");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState(modes[0].value);
  const { region } = useRegion();
  const { user } = useAuth();

  // Hide default geocoder icon
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `.mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--icon { display: none; }`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Initialize map, geocoder, directions
  useEffect(() => {
    if (!mapContainer.current) return;
    const center = regionCenters[region] || regionCenters.US;

    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center,
        zoom: 3.5,
      });
      map.current.addControl(new mapboxgl.NavigationControl());

      // Geocoder
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl,
        placeholder: "Search start or end",
        marker: false,
      });
      geocoderContainer.current?.appendChild(geocoder.onAdd(map.current));

      // Directions control
      const dir = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        unit: "metric",
        profile: "mapbox/driving",
        interactive: true,
        controls: { instructions: true },
      });
      directionsControl.current = dir;

      // Mount directions UI into our container
      const ui = dir.onAdd(map.current);
      directionsContainer.current?.appendChild(ui);

      dir.on("route", async () => {
        const o = dir.getOrigin()?.geometry.coordinates as [number, number] | undefined;
        const d = dir.getDestination()?.geometry.coordinates as [number, number] | undefined;
        if (o) setOriginName(await reverseGeocode(o));
        if (d) setDestName(await reverseGeocode(d));
        await fetchTripSuggestions();
      });
    } else {
      map.current.jumpTo({ center });
    }
  }, [region]);

  
  // Pin-drop mode
  useEffect(() => {
    if (!map.current) return;
    const onClick = async (e: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
      if (!adding) return;
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const place = await reverseGeocode(coords);
      const newWp: Waypoint = { coords, name: place };
      setWaypoints((w) => [...w, newWp]);
      const el = document.createElement("div");
      el.className = "text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center";
      el.innerText = String(waypoints.length + 1);
      new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map.current!);
      directionsControl.current!.addWaypoint(waypoints.length, coords);
      setAdding(false);
      map.current!.getCanvas().style.cursor = "";
    };
    map.current.on("click", onClick);
    return () => map.current!.off("click", onClick);
  }, [adding, waypoints]);

  async function reverseGeocode([lng, lat]: [number, number]): Promise<string> {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
    );
    const data = await res.json();
    return data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  const submitTripPlan = async () => {
    const dir = directionsControl.current!;
    const originCoords = dir.getOrigin()?.geometry.coordinates as [number, number] | undefined;
    const destCoords = dir.getDestination()?.geometry.coordinates as [number, number] | undefined;
    if (!user || !originCoords || !destCoords) return;
    const TRIP_WEBHOOK_URL = import.meta.env.VITE_N8N_TRIP_WEBHOOK;
    const payload = {
      user_id: user.id,
      origin: { name: originName, coords: originCoords },
      destination: { name: destName, coords: destCoords },
      stops: waypoints,
      routeMode: dir.getProfile(),
      travelMode: mode,
    };
    try {
      await fetch(TRIP_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Trip webhook failed", err);
    }
  };

  async function fetchTripSuggestions() {
    const dir = directionsControl.current!;
    const origin = dir.getOrigin()?.geometry.coordinates as [number, number] | undefined;
    const dest = dir.getDestination()?.geometry.coordinates as [number, number] | undefined;
    if (!origin || !dest) return;
    setLoading(true);
    try {
      const payload = {
        origin: { coordinates: origin, name: originName },
        destination: { coordinates: dest, name: destName },
        waypoints: waypoints.map(wp => ({ coordinates: wp.coords, name: wp.name })),
        profile: dir.getProfile(),
        mode,
      };
      const TRIP_WEBHOOK_URL = import.meta.env.VITE_N8N_TRIP_WEBHOOK;
      const res = await fetch(TRIP_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setSuggestions(json.suggestions || []);
      await saveTrip();
      await submitTripPlan();
    } catch (error) {
      console.error("Error fetching trip suggestions:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveTrip() {
    const dir = directionsControl.current!;
    const origin = dir.getOrigin()?.geometry.coordinates as [number, number] | undefined;
    const dest = dir.getDestination()?.geometry.coordinates as [number, number] | undefined;
    if (!user || !origin || !dest) return;
    setSaving(true);
    await supabase.from("trips").insert({
      user_id: user.id,
      start_location: JSON.stringify({ name: originName, coords: origin }),
      end_location: JSON.stringify({ name: destName, coords: dest }),
      start_date: new Date(),
      arrival_date: new Date(),
      route: { origin, dest, routingProfile: dir.getProfile() },
      trip_pois: suggestions,
      route_preferences: { mode, requiredWaypoints: waypoints.map(w => w.coords) },
    });
    setSaving(false);
  }

  return (
    <div className="space-y-4 w-full">
      <p className="text-sm text-gray-500">
        Tip: Ask Pam—“Plan my trip from {originName} to {destName}.”
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 overflow-hidden rounded-lg border">
          <div ref={mapContainer} className="h-[600px] w-full" />
        </div>
        
        {/* Directions panel */}
        <div className="lg:col-span-1">
          <div
            ref={directionsContainer}
            className="bg-white rounded-lg border p-4 h-[600px] overflow-y-auto"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label htmlFor="routeMode">Route mode:</label>
          <select
            id="routeMode"
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
        </div>
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
          onClick={submitTripPlan}
          className="px-4 py-2 text-white bg-green-600 hover:opacity-90 rounded transition-opacity"
        >
          Send to Pam
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Use the search box below to find and add additional stops by name or address.
      </p>

      <div
        ref={geocoderContainer}
        className="w-full max-w-md p-2 border rounded bg-white shadow-md mt-1"
      />

      {waypoints.length > 0 && (
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
                    setWaypoints((prev) => prev.filter((_, idx) => idx !== i));
                  }}
                >
                  ❌
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && <p className="text-center text-gray-600">Planning…</p>}
      {saving && <p className="text-center text-gray-600">Saving…</p>}
      {suggestions.length > 0 && (
        <>
          <h3 className="text-xl font-semibold">Pam suggests:</h3>
          <div className="overflow-x-auto pb-4">
            <div className="flex space-x-4">
              {suggestions.map((item) => (
                <Card
                  key={item.name}
                  className="min-w-[280px] cursor-pointer hover:border-primary transition-colors"
                >
                  <CardContent className="p-4">
                    <h4 className="font-bold">{item.name}</h4>
                    <p className="text-gray-600 text-sm">
                      {item.tags?.join(",") || item.type}
                    </p>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm"
                    >
                      Visit Website
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
