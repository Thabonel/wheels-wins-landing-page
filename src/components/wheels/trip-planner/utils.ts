
import { mapboxProxy } from "@/services/mapboxProxy";
import { circle } from "@turf/turf";
import type { FeatureCollection, Feature } from "geojson";

export async function reverseGeocode([lng, lat]: [number, number]): Promise<string> {
  try {
    const data = await mapboxProxy.geocoding.reverse(lng, lat);
    return data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export function hideGeocoderIcon() {
  const style = document.createElement("style");
  style.innerHTML = `.mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--icon { display: none; }`;
  document.head.appendChild(style);
  return () => {
    if (document.head.contains(style)) {
      document.head.removeChild(style);
    }
  };
}

export async function fetchPhoneCoverage(lng: number, lat: number): Promise<FeatureCollection> {
  const apiKey = import.meta.env.OPEN_CELL_ID_API_KEY;
  if (!apiKey) {
    console.warn("OPEN_CELL_ID_API_KEY is not set");
    return { type: "FeatureCollection", features: [] };
  }

  const url = `https://opencellid.org/cell/get?key=${apiKey}&lat=${lat}&lon=${lng}&format=json`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const cells = json.cells || [];
    const features = cells.map((c: any) =>
      circle([c.lon, c.lat], (c.range || 1000) / 1000, { steps: 32, units: "kilometers" }) as Feature
    );
    return { type: "FeatureCollection", features };
  } catch (err) {
    console.error("Failed to fetch phone coverage", err);
    return { type: "FeatureCollection", features: [] };
  }
}
