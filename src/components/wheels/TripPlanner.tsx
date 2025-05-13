import 'mapbox-gl/dist/mapbox-gl.css';
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import { Card, CardContent } from "@/components/ui/card";
import { useRegion } from "@/context/RegionContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// center coords [lng, lat]
const regionCenters: Record<string, [number, number]> = {
  Australia: [133.7751, -25.2744],
  US: [-98.5795, 39.8283],
  Canada: [-106.3468, 56.1304],
  NZ: [174.8860, -40.9006],
  UK: [-3.435973, 55.378051],
};

const modes = [
  { label: "Fastest", value: "fastest" },
  { label: "Shortest", value: "shortest" },
  { label: "Scenic", value: "scenic" },
];

export default function TripPlanner() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const geocoderContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>();
  const directionsControl = useRef<MapboxDirections>();

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState(modes[0].value);

  const { region } = useRegion();
  const { user } = useAuth();

  // hide geocoder icon
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = '.mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--icon { display: none; }';
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  async function fetchTripSuggestions() {
    const dir = directionsControl.current!;
    const origin = dir.getOrigin()?.geometry.coordinates;
    const dest = dir.getDestination()?.geometry.coordinates;
    const profile = dir.getProfile();
    if (!origin || !dest) return;

    setLoading(true);
    try {
      const payload = { region, travelStyle: profile, vehicleType: "4WD Camper",
        interests: ["parks","fuel"], route: { origin, dest, profile },
        routePreferences: { mode, requiredStops: [] } };
      const res = await fetch("/n8n/webhooks/trip-plan-suggestion", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      const json = await res.json();
      setSuggestions(json.suggestions||[]);
      saveTrip();
    } finally { setLoading(false); }
  }

  async function saveTrip() {
    const dir = directionsControl.current!;
    const origin = dir.getOrigin()?.geometry.coordinates;
    const dest = dir.getDestination()?.geometry.coordinates;
    if (!user || !origin || !dest) return;

    setSaving(true);
    await supabase.from("trips").insert({ user_id:user.id, start:new Date(), end:new Date(), route:{origin,dest,profile:dir.getProfile()}, trip_pois:suggestions, route_preferences:{mode,requiredStops:[]} });
    setSaving(false);
  }

  useEffect(() => {
    if (!mapContainer.current) return;
    const center = regionCenters[region]||regionCenters.US;
    if (map.current) { map.current.jumpTo({center}); return; }
    map.current = new mapboxgl.Map({ container:mapContainer.current, style:"mapbox://styles/mapbox/streets-v11", center, zoom:3.5 });
    map.current.addControl(new mapboxgl.NavigationControl());

    const geocoder = new MapboxGeocoder({ accessToken:mapboxgl.accessToken, mapboxgl, placeholder:"Search start or end", marker:false });
    geocoderContainer.current?.appendChild(geocoder.onAdd(map.current));

    const dir = new MapboxDirections({ accessToken:mapboxgl.accessToken, unit:"metric", profile:"mapbox/driving", interactive:true, controls:{instructions:true} });
    directionsControl.current = dir;
    map.current.addControl(dir,"top-left");
    dir.on("route",fetchTripSuggestions);
  },[region]);

  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;
    map.current.getStyle().layers?.forEach(l=>{ if(l.id.startsWith("marker-")){ map.current!.removeLayer(l.id); map.current!.removeSource(l.id); }});
    const b=new mapboxgl.LngLatBounds();
    suggestions.forEach(item=>{ new mapboxgl.Marker({anchor:"bottom"}).setLngLat([item.lng,item.lat]).setPopup(new mapboxgl.Popup({offset:25}).setHTML(`<h3>${item.name}</h3><p>${item.tags?.join(",")}</p>`)).addTo(map.current!); b.extend([item.lng,item.lat]); });
    suggestions.length&&map.current.fitBounds(b,{padding:{top:60,bottom:60,left:60,right:60}});
  },[suggestions]);

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Tip: Ask Pam—“Plan my trip from A to B.”</p>
        <div ref={geocoderContainer} className="w-1/3" />
      </div>
      <div ref={mapContainer} className="rounded-lg border h-[400px] w-full" />
      {loading && <p className="text-center text-gray-600">Planning…</p>}
      {saving && <p className="text-center text-gray-600">Saving…</p>}
      {suggestions.length>0 && (
        <>
          <div className="flex items-center space-x-2">
            <label htmlFor="routeMode">Route mode:</label>
            <select id="routeMode" value={mode} onChange={e=>setMode(e.target.value)} className="border rounded p-1">
              {modes.map(m=>(<option key={m.value} value={m.value}>{m.label}</option>))}
            </select>
          </div>
          <h3 className="text-xl font-semibold">Pam suggests:</h3>
          <div className="overflow-x-auto pb-4"><div className="flex space-x-4">
            {suggestions.map(item=>(
              <Card key={item.name} className="min-w-[280px] cursor-pointer hover:border-primary transition-colors"><CardContent className="p-4">
                <h4 className="font-bold">{item.name}</h4>
                <p className="text-gray-600 text-sm">{item.tags?.join(",")||item.type}</p>
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">Visit Website</a>
              </CardContent></Card>
            ))}
          </div></div>
        </>
      )}
    </div>);
}
